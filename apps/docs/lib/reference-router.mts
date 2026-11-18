import {
  MarkdownPageEvent,
  MarkdownTheme,
  MemberRouter,
  type MarkdownRenderer,
} from "typedoc-plugin-markdown";
import {
  DeclarationReflection,
  PageKind,
  ReflectionKind,
  Slugger,
  type ProjectReflection,
} from "typedoc";

/** Preserve declaration routes while giving public members their own native template. */
export function installReferenceRouter(
  renderer: MarkdownRenderer,
  identities: Map<number, string>,
) {
  const legacy = new Map<number, string>();
  class ReferenceRouter extends MemberRouter {
    override buildPages(project: ProjectReflection) {
      const pages = super.buildPages(project);
      for (const reflection of Object.values(project.reflections)) {
        if (
          !(reflection instanceof DeclarationReflection) ||
          !reflection.kindOf(
            ReflectionKind.Method |
              ReflectionKind.Property |
              ReflectionKind.Accessor |
              ReflectionKind.Constructor,
          ) ||
          !reflection.parent?.kindOf(
            ReflectionKind.Class | ReflectionKind.Interface | ReflectionKind.TypeAlias,
          )
        )
          continue;
        const identity = identities.get(reflection.id);
        if (!identity) {
          // TypeDoc models a constructor type's anonymous callable body as a
          // Constructor, but it belongs to the alias template, not the public inventory.
          const owner = reflection.parent;
          if (
            owner instanceof DeclarationReflection &&
            owner.type?.type === "reflection" &&
            owner.type.declaration === reflection
          )
            continue;
          throw new Error(`Missing member identity: ${reflection.getFullName()}`);
        }
        legacy.set(reflection.id, this.getFullUrl(reflection));
        // Each encoded identity segment remains separate, keeping filenames bounded.
        const safeIdentity = identity
          .split("/")
          .map((segment) =>
            [...Buffer.from(decodeURIComponent(segment))]
              .map((byte) =>
                /[a-zA-Z0-9_-]/.test(String.fromCharCode(byte))
                  ? String.fromCharCode(byte)
                  : `~${byte.toString(16).padStart(2, "0")}`,
              )
              .join(""),
          )
          .join("/");
        const url = `members/${safeIdentity}.md`;
        if (pages.some((page) => page.url === url))
          throw new Error(`Duplicate member route: ${url}`);
        this.fullUrls.set(reflection, url);
        this.anchors.delete(reflection);
        this.sluggers.set(reflection, new Slugger(this.sluggerConfiguration));
        reflection.traverse((child) => {
          this.buildAnchors(child, reflection);
          return true;
        });
        pages.push({ kind: PageKind.Reflection, model: reflection, url });
      }
      return pages;
    }
  }
  renderer.defineRouter("canonical-members", ReferenceRouter);
  renderer.application.options.setValue("router", "canonical-members");
  renderer.on(MarkdownPageEvent.END, (page: MarkdownPageEvent) => {
    if (
      !page.isReflectionEvent() ||
      !(page.model instanceof DeclarationReflection) ||
      !renderer.router
    )
      return;
    const model = page.model;
    const router = renderer.router;
    const previous = legacy.get(model.id);
    if (previous && model.parent instanceof DeclarationReflection) {
      const owner = model.parent;
      const context = (renderer.theme as MarkdownTheme).getRenderContext(page);
      const ownerLink = router.relativeUrl(model, owner);
      const generics = owner.typeParameters?.length
        ? `\n\n## Owner type parameters\n\n${context.partials.typeParametersList(owner.typeParameters, { headingLevel: 2 })}`
        : "";
      page.contents += `\n\n## Context\n\nOwner: [${owner.name}](${ownerLink}).${generics}\n`;
    }
    for (const child of model.children ?? []) {
      const old = legacy.get(child.id);
      const anchor = old?.split("#")[1];
      if (!anchor) continue;
      page.contents += `\n\n## ${child.name} {#${anchor}}\n\n[${child.name}](${router.relativeUrl(model, child)})\n`;
    }
  });
}
