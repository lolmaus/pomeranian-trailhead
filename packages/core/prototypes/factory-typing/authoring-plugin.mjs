// Throwaway source rule. Run together with strict TypeScript, never instead of it.
const bareType = (node, name) =>
  node?.type === "TSTypeReference" &&
  node.typeName.type === "Identifier" &&
  node.typeName.name === name &&
  !(node.typeArguments ?? node.typeParameters)?.params.length;

const annotation = (node) => node?.typeAnnotation?.typeAnnotation;
const member = (node, name) => node?.members?.find((item) => item.key?.name === name);

// This proof has two closed class modules. Validate their actual class exports
// against this inventory before treating an imported binding as a constructor.
const classExports = {
  "./probe.mts": [
    "PageObject",
    "DomPageObject",
    "Element",
    "Item",
    "Menu",
    "Settings",
    "App",
    "PlainItem",
    "Toolbar",
    "CompactToolbar",
    "ConfirmationDialog",
    "LibraryButton",
    "AppButton",
    "StandaloneButton",
    "FlexibleButton",
  ],
  "./contracts.mts": [
    "Styled",
    "Restricted",
    "ValueButton",
    "AppValueButton",
    "NullValueButton",
    "Counter",
    "HtmlApp",
    "GroupApp",
    "LiteralValue",
  ],
};

export const authoringRule = {
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: { framework: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
    messages: {
      constructor: "Retain the inherited constructor; initialize custom state in instance fields.",
      factory: "Retain the inherited static create method.",
      metadata: "Generic classes must declare their own readonly [defaultInstanceType] metadata.",
      parameters:
        "Metadata must name the bare class instance and every generic parameter directly.",
      check:
        "Add a same-scope checkLibrary<Class>()(Class) assertion using the bare instance type.",
      imports:
        "Import checkLibrary and defaultInstanceType by their canonical names from ./probe.mts.",
      shape:
        "Use a named class declaration with a named superclass; class expressions and mixins are outside this proof.",
      topLevel: "Use top-level class declarations in this bounded prototype authoring format.",
      ancestor:
        "Use a checked superclass declaration or an import from ./probe.mts or ./contracts.mts.",
      suppression:
        "Do not suppress TypeScript diagnostics on required metadata or conformance assertions.",
      instantiation:
        "Bind generic parameters through a concrete subclass; constructor instantiation is outside this proof.",
      directClass:
        "Use a direct checked class identifier for create/rootFixture; constructor aliases erase constraints.",
      directHelper:
        "Call rootFixture directly; helper aliases and namespace imports are outside this proof.",
      moduleFormat:
        "Use inline class/function/type exports; exported variables, export lists, and namespaces are outside this proof.",
      inventory:
        "Update the checked class-export inventory to match this module's actual class declarations.",
    },
  },
  create(context) {
    const framework = context.options[0]?.framework === true;
    const program = context.sourceCode.ast;
    const report = (node, messageId) => context.report({ node, messageId });
    const importsFromCore = program.body.filter(
      (item) =>
        item.type === "ImportDeclaration" &&
        ["./probe.mts", "./contracts.mts"].includes(item.source.value),
    );
    const fixtureNames = importsFromCore
      .flatMap((item) => item.specifiers)
      .filter((item) => item.type === "ImportSpecifier" && item.imported.name === "rootFixture")
      .map((item) => item.local.name);
    if (framework) fixtureNames.push("rootFixture");
    const definition = (node) => {
      if (node?.type !== "Identifier") return undefined;
      for (let scope = context.sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(node.name);
        if (variable) return variable.defs[0];
      }
      return undefined;
    };
    const directClass = (node) => {
      const def = definition(node);
      if (def?.type === "ClassName") return def.node.type === "ClassDeclaration";
      return (
        def?.type === "ImportBinding" &&
        def.node.type === "ImportSpecifier" &&
        classExports[def.parent.source.value]?.includes(def.node.imported.name)
      );
    };
    const suppressed = (node) =>
      [
        ...context.sourceCode.getCommentsBefore(node),
        ...context.sourceCode
          .getAllComments()
          .filter(
            (comment) => comment.range[0] >= node.range[0] && comment.range[1] <= node.range[1],
          ),
      ].some((comment) => /@ts-(?:ignore|expect-error|nocheck)/u.test(comment.value));

    function visit(node) {
      if (
        node.type !== "ClassDeclaration" ||
        !node.id ||
        (node.superClass && node.superClass.type !== "Identifier")
      ) {
        report(node, "shape");
        return;
      }
      const statement = node.parent.type === "ExportNamedDeclaration" ? node.parent : node;
      if (statement.parent.type !== "Program") report(node, "topLevel");
      if (suppressed(statement)) report(statement, "suppression");
      if (node.superClass && !directClass(node.superClass)) report(node.superClass, "ancestor");
      const trusted = framework && ["PageObject", "DomPageObject"].includes(node.id.name);
      for (const item of node.body.body) {
        if (item.kind === "constructor" && !trusted) report(item, "constructor");
        if (
          item.static &&
          (item.key?.name === "create" || item.key?.value === "create" || item.computed) &&
          !trusted
        )
          report(item, "factory");
      }
      const parameters = node.typeParameters?.params ?? [];
      if (!parameters.length) return;

      const imports = program.body
        .filter((item) => item.type === "ImportDeclaration" && item.source.value === "./probe.mts")
        .flatMap((item) => item.specifiers)
        .filter((item) => item.type === "ImportSpecifier" && item.imported.name === item.local.name)
        .map((item) => item.local.name);
      if (
        !framework &&
        !["checkLibrary", "defaultInstanceType"].every((name) => imports.includes(name))
      ) {
        report(node, "imports");
      }
      const field = node.body.body.find(
        (item) => item.computed && item.key.name === "defaultInstanceType",
      );
      if (!field || !field.declare || !field.readonly || field.static) {
        report(node, "metadata");
      } else {
        if (suppressed(field)) report(field, "suppression");
        const metadata = annotation(field);
        const instance = member(metadata, "instance");
        const vector = annotation(member(metadata, "parameters"));
        const names = parameters.map((parameter) => parameter.name.name ?? parameter.name);
        const covered = vector?.members?.map((item) => annotation(item));
        if (
          metadata?.type !== "TSTypeLiteral" ||
          !bareType(annotation(instance), node.id.name) ||
          vector?.type !== "TSTypeLiteral" ||
          !vector.members.every((item) => item.type === "TSPropertySignature" && !item.computed) ||
          !names.every((name) => covered?.some((type) => bareType(type, name)))
        )
          report(field, "parameters");
      }

      const siblings = statement.parent?.body;
      const checked =
        Array.isArray(siblings) &&
        siblings.some((item) => {
          const call = item.type === "ExpressionStatement" ? item.expression : undefined;
          const helper = call?.callee;
          const arguments_ = helper?.typeArguments ?? helper?.typeParameters;
          const matches =
            call?.type === "CallExpression" &&
            helper?.type === "CallExpression" &&
            helper.callee.name === "checkLibrary" &&
            helper.arguments.length === 0 &&
            arguments_?.params.length === 1 &&
            bareType(arguments_.params[0], node.id.name) &&
            call.arguments.length === 1 &&
            call.arguments[0].type === "Identifier" &&
            call.arguments[0].name === node.id.name;
          if (matches && suppressed(item)) report(item, "suppression");
          return matches;
        });
      if (!checked) report(node, "check");
    }
    return {
      Program(node) {
        const moduleName = "./" + context.filename.replaceAll("\\", "/").split("/").at(-1);
        const inventory = classExports[moduleName];
        if (inventory) {
          const actual = program.body
            .filter(
              (item) =>
                item.type === "ExportNamedDeclaration" &&
                item.declaration?.type === "ClassDeclaration",
            )
            .map((item) => item.declaration.id.name);
          if (
            actual.length !== inventory.length ||
            actual.some((name) => !inventory.includes(name))
          ) {
            report(node, "inventory");
          }
        }
        for (const comment of context.sourceCode.getAllComments()) {
          if (/@ts-nocheck/u.test(comment.value)) report(node, "suppression");
        }
      },
      ClassDeclaration: visit,
      ClassExpression: visit,
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          fixtureNames.includes(node.callee.name) &&
          !directClass(node.arguments[0])
        )
          report(node, "directClass");
      },
      VariableDeclarator(node) {
        if (directClass(node.init)) report(node, "directClass");
      },
      MemberExpression(node) {
        if (
          (node.property.name ?? node.property.value) === "create" &&
          (!directClass(node.object) ||
            node.parent.type !== "CallExpression" ||
            node.parent.callee !== node)
        ) {
          report(node, "directClass");
        }
      },
      Identifier(node) {
        if (!fixtureNames.includes(node.name)) return;
        if (["ImportSpecifier", "FunctionDeclaration", "TSTypeQuery"].includes(node.parent.type))
          return;
        if (node.parent.type === "CallExpression" && node.parent.callee === node) return;
        report(node, "directHelper");
      },
      ImportNamespaceSpecifier(node) {
        if (importsFromCore.includes(node.parent)) report(node, "directHelper");
      },
      ExportNamedDeclaration(node) {
        if (
          !node.declaration ||
          (node.declaration.type === "VariableDeclaration" &&
            !(
              framework &&
              node.declaration.declarations.every((item) => item.id.name === "defaultInstanceType")
            ))
        ) {
          report(node, "moduleFormat");
        }
      },
      ExportDefaultDeclaration(node) {
        report(node, "moduleFormat");
      },
      TSModuleDeclaration(node) {
        report(node, "moduleFormat");
      },
      TSInstantiationExpression(node) {
        report(node, "instantiation");
      },
    };
  },
};

export default { meta: { name: "factory-authoring" }, rules: { contract: authoringRule } };
