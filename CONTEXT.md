# Albaik

The Albaik Group public website and its content back office. It publishes the
company's product portfolio and the approved product information behind it, and
gives internal staff a dashboard to maintain that content without a redeploy.

## Language

### Catalogue

The product hierarchy is **Collection → Brand → Product**. A collection groups
brands by the kind of care they provide; a brand is a house label; a product is a
sellable formulation within one brand. A brand may appear in several collections,
so a brand's identity is only unique as the pair (collection, brand).

**Collection**:
The catalogue's top level — a group of brands serving one kind of care, such as
hair care or skin care.
_Avoid_: Category. This is the word the interface uses; "category" is only the
storage-layer name for the same thing, and the two should not both appear in
product discussion.

**Brand**:
A house label that owns products, such as Albaik or Avora Shine. The same brand
may span several collections.
_Avoid_: Manufacturer, label, company.

**Product**:
One sellable formulation, belonging to exactly one brand in exactly one
collection.
_Avoid_: Item, SKU, formulation.

**Product frame**:
The fixed frame a product image is shown in — the same 4:5 shape on every
surface, and it never crops. A correctly prepared photograph is shown whole, so
the same file appears identically on a card, in the gallery, in a thumbnail and
in the dashboard.
_Avoid_: Image box, image stage, aspect ratio.

### Home page

**Home section**:
A block the home page is assembled from, owned and ordered by staff in the
dashboard. The hero is one section among several.
_Avoid_: Section, block, component.

**Hero slide**:
One entry in the home hero's carousel. Each slide carries its own headline,
calls to action, badge and backdrop, and staff may add, remove or reorder them.
_Avoid_: Banner, slide deck, carousel item.

**Backdrop**:
The full-width photograph behind a hero slide's text. A slide shows at most one
image and it always sits behind the content, never beside it.
_Avoid_: Image, picture, hero image. The word "image" is reserved for photographs
of the products themselves.

**Default backdrop**:
The section-level backdrop a slide falls back to when it has none of its own, so
a half-built carousel still looks finished.
_Avoid_: Fallback image, placeholder, background image.

**Focal point**:
Which part of a backdrop the crop preserves. It is measured *toward the text*
rather than from a physical edge, so it means the same thing in every writing
direction.
_Avoid_: Object position, image position, crop anchor.

**Slide badge**:
The small trust marker on a slide — an uppercase label with a supporting line,
such as an approvals statement. It belongs to the slide, not to any product, and
it sits within the slide's text.
_Avoid_: Trust badge, ribbon, tag.

**Product plate**:
The branded gradient panel that stands in for a product that has no
photography. It fills the same Product frame as a photograph and appears on
cards and detail pages wherever a product image is expected and none exists, and
never in the hero.
_Avoid_: Placeholder, placeholder image, skeleton.

**Trust pillar**:
One claim in the home page's approach section — an icon, a short headline and a
supporting line used to reassure the visitor. Every pillar is a separate row a
staff member can add, remove or reorder.
_Avoid_: Trust ribbon, approach pillar, USP.
