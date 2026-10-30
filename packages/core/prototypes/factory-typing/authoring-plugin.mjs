// Throwaway source rule. Run together with strict TypeScript, never instead of it.
const bareType = (node, name) =>
  node?.type === "TSTypeReference" &&
  node.typeName.type === "Identifier" &&
  node.typeName.name === name &&
  !(node.typeArguments ?? node.typeParameters)?.params.length;

const annotation = (node) => node?.typeAnnotation?.typeAnnotation;
const member = (node, name) => node?.members?.find((item) => item.key?.name === name);

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
    },
  },
  create(context) {
    const framework = context.options[0]?.framework === true;
    const program = context.sourceCode.ast;
    const report = (node, messageId) => context.report({ node, messageId });
    const suppressed = (node) =>
      context.sourceCode
        .getCommentsBefore(node)
        .some((comment) => /@ts-(?:ignore|expect-error|nocheck)/u.test(comment.value));

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
      const declarations = program.body.map((item) =>
        item.type === "ExportNamedDeclaration" ? item.declaration : item,
      );
      const bases = declarations
        .filter((item) => item?.type === "ClassDeclaration")
        .map((item) => item.id?.name);
      bases.push(
        ...program.body
          .filter(
            (item) =>
              item.type === "ImportDeclaration" &&
              ["./probe.mts", "./contracts.mts"].includes(item.source.value),
          )
          .flatMap((item) => item.specifiers)
          .map((item) => item.local.name),
      );
      if (node.superClass && !bases.includes(node.superClass.name))
        report(node.superClass, "ancestor");
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
        for (const comment of context.sourceCode.getAllComments()) {
          if (/@ts-nocheck/u.test(comment.value)) report(node, "suppression");
        }
      },
      ClassDeclaration: visit,
      ClassExpression: visit,
      TSInstantiationExpression(node) {
        report(node, "instantiation");
      },
    };
  },
};

export default { meta: { name: "factory-authoring" }, rules: { contract: authoringRule } };
