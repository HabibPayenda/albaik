using Albaik.Api.Models;
using Albaik.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Albaik.Api.Data;

/// <summary>
/// Seeds the database with the catalogue and copy taken from
/// "Albaik_Website_Content_2026_English.docx".
///
/// Deliberately NOT seeded, because the source document states that only approved
/// official product documentation may be used for them:
///   * ingredient lists / INCI declarations  -> left empty, admin fills from the label
///   * percentages, lab figures, certifications
///   * customer testimonials -> seeded inactive so no review is fabricated
///   * retail prices -> seeded as sample values, toggle with the "catalog.showPrices" setting
/// </summary>
public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, ILogger logger, string adminUser, string adminPassword)
    {
        // Databases created before the header's mega-menu quick links became a first-class
        // resource have no rows in the freshly added QuickLinks table (the early return
        // below would otherwise skip them entirely on every boot). Top the defaults up
        // until staff replace them, so an upgraded database never boots with an empty
        // Quick links tab while the header still shows four links.
        if (!await db.QuickLinks.AnyAsync())
        {
            db.QuickLinks.AddRange(
                Q("All products", "/collections", 1),
                Q("Shampoo guide", "/guides/shampoo-guide", 2),
                Q("Quality & Verification", "/quality", 3),
                Q("Distribution & Wholesale", "/distribution", 4));
            await db.SaveChangesAsync();
        }

        // The same story for settings added after the catalogue's first seed: the early
        // return below skips the bulk AddRange on an existing database, so a new setting
        // row would never appear there and its tab would be missing from the settings
        // screen. Top `search.suggestions` up on every boot until staff replace it.
        if (!await db.SiteSettings.AnyAsync(s => s.Key == "search.suggestions"))
        {
            db.SiteSettings.Add(S(
                "search.suggestions",
                """[{"label":"Anti-dandruff care","query":"dandruff"},{"label":"Post-oil cleansing","query":"purify"},{"label":"Repair & nourish","query":"repair"},{"label":"Face wash","query":"face"},{"label":"Avora Shine","query":"avora"}]""",
                "search", "Search suggestion chips", "json"));
            await db.SaveChangesAsync();
        }

        // Same pattern for the site-owned copy: product tab labels, the "All formulas"
        // filter chip and the contact-form labels are settings now, so an upgraded
        // database gains them here (the bulk AddRange below skips existing databases)
        // and the frontend falls back to the text below whenever a value is blank.
        // Keep the values in lock-step with the `SiteCopySettingsTests` contract.
        if (!await db.SiteSettings.AnyAsync(s => s.Key.StartsWith("labels.")))
        {
            db.SiteSettings.AddRange(
                S("labels.productTab.benefits", "Key benefits", "labels", "Product tabs — Key benefits"),
                S("labels.productTab.usage", "How to use", "labels", "Product tabs — How to use"),
                S("labels.productTab.safety", "Safety", "labels", "Product tabs — Safety"),
                S("labels.featured.allFormulas", "All formulas", "labels", "Featured — All formulas filter"),
                S("labels.contact.fullName", "Full name", "labels", "Contact form — Full name"),
                S("labels.contact.email", "Email address", "labels", "Contact form — Email address"),
                S("labels.contact.phone", "Phone / WhatsApp", "labels", "Contact form — Phone / WhatsApp"),
                S("labels.contact.company", "Company / shop", "labels", "Contact form — Company / shop"),
                S("labels.contact.enquiryType", "Enquiry type", "labels", "Contact form — Enquiry type"),
                S("labels.contact.subject", "Subject", "labels", "Contact form — Subject"),
                S("labels.contact.message", "Message", "labels", "Contact form — Message"),
                S("labels.contact.submit", "Send message", "labels", "Contact form — Send button"));
            await db.SaveChangesAsync();
        }

        // Same reasoning as the settings above: a database created before printed QR codes
        // existed must still get the field, or staff have nowhere to set the origin the
        // codes encode. Empty is the right default — it falls back to the request host,
        // which is the public domain when the site serves its own dashboard.
        if (!await db.SiteSettings.AnyAsync(s => s.Key == "site.publicBaseUrl"))
        {
            db.SiteSettings.Add(S("site.publicBaseUrl", "", "general", "Public site URL (used in product QR codes)", "text"));
            await db.SaveChangesAsync();
        }

        // WhatsApp channels are a social profile, not a phone number. The row is added
        // for upgraded databases whose social tab predates it.
        if (!await db.SiteSettings.AnyAsync(s => s.Key == "social.whatsapp"))
        {
            db.SiteSettings.Add(S("social.whatsapp", "", "social", "WhatsApp channel URL", "url"));
            await db.SaveChangesAsync();
        }

        // A WhatsApp channel URL was previously stored in the LinkedIn field by mistake.
        // Move it to the correct row once; a real LinkedIn URL is left untouched.
        var whatsappSetting = await db.SiteSettings.FirstOrDefaultAsync(s => s.Key == "social.whatsapp");
        var linkedInSetting = await db.SiteSettings.FirstOrDefaultAsync(s => s.Key == "social.linkedin");
        var linkedInValue = linkedInSetting?.Value?.Trim() ?? "";
        if (whatsappSetting is not null
            && string.IsNullOrWhiteSpace(whatsappSetting.Value)
            && (linkedInValue.Contains("whatsapp.com", StringComparison.OrdinalIgnoreCase)
                || linkedInValue.Contains("wa.me", StringComparison.OrdinalIgnoreCase)))
        {
            whatsappSetting.Value = linkedInValue;
            linkedInSetting!.Value = "";
            await db.SaveChangesAsync();
        }

        if (await db.Categories.AnyAsync()) return;

        logger.LogInformation("Seeding Albaik catalogue and content…");

        // ---------------------------------------------------------------- settings
        db.SiteSettings.AddRange(
            S("site.name", "Albaik Group of Companies", "general", "Site name"),
            S("site.shortName", "ALBAIK", "general", "Short name"),
            S("site.tagline", "The Mark of Pure Perfection", "general", "Tagline"),
            S("site.description", "Albaik Group of Companies develops personal-care, beauty, hair-care, oral-care and everyday products with a focus on practical benefits, consistent quality and reliable product performance.", "general", "Meta description", "textarea"),
            // NOTE: two seeded values were removed here.
            //
            // `site.taglineAlt` held a Pashto tagline and the hero carried a
            // "bilingual heritage note" in Dari/Pashto. Both rendered inside the English
            // site. `site.heroNote` held marketing prose ("regenerative aqueous
            // suspensions with clinically balanced botanicals") that appears nowhere in
            // the source document — the same violation as an invented percentage.
            //
            // Localised copy belongs in a real translation field when the Dari and
            // Pashto editions are built, not in the English page.

            S("contact.email", "info@albaik-group.com", "contact", "Email address"),
            S("contact.phone", "+93 700 000 000", "contact", "Phone"),
            S("contact.whatsapp", "+93 700 000 000", "contact", "WhatsApp"),
            S("contact.address", "Head Office, Kabul, Afghanistan", "contact", "Head office", "textarea"),
            S("contact.hours", "Saturday – Thursday, 8:00 – 17:00", "contact", "Opening hours"),
            S("contact.mapEmbed", "", "contact", "Google Maps embed URL", "url"),

            S("social.facebook", "", "social", "Facebook URL", "url"),
            S("social.instagram", "", "social", "Instagram URL", "url"),
            S("social.tiktok", "", "social", "TikTok URL", "url"),
            S("social.linkedin", "", "social", "LinkedIn URL", "url"),

            S("catalog.showPrices", "true", "catalog", "Show prices on product cards", "bool"),
            S("catalog.priceOnRequest", "Price on request", "catalog", "Fallback price label"),
            S("catalog.currency", "AFN", "catalog", "Default currency"),

            S("ticker.enabled", "true", "ticker", "Show the announcement bar", "bool"),
            S("ticker.text", "Care that starts with what matters — explore the Albaik and Avora Shine collections", "ticker", "Announcement text"),
            S("ticker.left", "Official Albaik Group", "ticker", "Left badge"),
            S("ticker.right", "Authenticity assured", "ticker", "Right badge"),

            S("footer.blurb", "The Mark of Pure Perfection. Albaik Group of Companies develops personal-care, beauty, hair-care and everyday products built around practical product purposes and consistent quality.", "footer", "Footer blurb", "textarea"),
            S("footer.newsletterTitle", "Join the Albaik mailing list", "footer", "Newsletter heading"),
            S("footer.copyright", "© 2026 Albaik Group of Companies. All rights reserved.", "footer", "Copyright line")
        );

        // ---------------------------------------------------------------- navigation
        //
        // Six items, and every one of them is justified by a section of the source
        // document. The previous set carried seven, and the labels wrapped onto three
        // lines at 1440px:
        //
        //   "Collection & Products"  -> "Collections"       (docx §3, §14)
        //   "Company Story"          -> "About"             (docx §2)
        //   "Where to Buy"           -> "Distribution"      (docx §20 — there is no store
        //                                                    locator, so "Where to Buy"
        //                                                    promised something we do not
        //                                                    have; the page is a wholesale
        //                                                    and distribution page)
        //   "Hair Rituals & Formula" -> removed from the top nav. It was marketing fluff
        //                               for two genuinely useful pages (docx §15 "Choosing
        //                               the Right Albaik Shampoo" and §16 "Correct Shampoo
        //                               Usage"), and "Formula" implied an ingredient
        //                               disclosure we cannot publish. Both pages remain,
        //                               reachable from the footer and from the hair-care
        //                               category page.
        db.NavLinks.AddRange(
            N("Home", "/", 1),
            N("Collections", "/collections", 2),
            N("About", "/about", 3),
            N("Quality & Verification", "/quality", 4),
            N("Distribution", "/distribution", 5),
            N("Contact", "/contact", 6)
        );

        db.FooterLinks.AddRange(
            F("Collections", "Hair Care", "/collections/hair-care", 1),
            F("Collections", "Skin Care", "/collections/skin-care", 2),
            F("Collections", "Oral Care", "/collections/oral-care", 3),
            F("Collections", "Everyday Essentials", "/collections/everyday-essentials", 4),

            F("Brands", "Albaik", "/brands/albaik", 1),
            F("Brands", "Avora Shine", "/brands/avora-shine", 2),

            F("Company", "About Albaik", "/about", 1),
            F("Company", "Product Quality", "/quality", 2),
            F("Company", "Product Safety", "/safety", 3),
            F("Company", "Distribution & Wholesale", "/distribution", 4),

            F("Support", "Contact Us", "/contact", 1),
            F("Support", "Choosing a Shampoo", "/guides/shampoo-guide", 2),
            F("Support", "Correct Shampoo Usage", "/guides/how-to-use", 3),
            F("Support", "Wholesale Enquiry", "/contact?topic=wholesale", 4)
        );

        // ---------------------------------------------------------------- home sections
        db.HomeSections.AddRange(
            new HomeSection
            {
                Key = "hero", SectionType = "hero", SortOrder = 1,
                Title = "The Mark of",
                Subtitle = "Care that starts with what matters.",
                Body = "Discover Albaik's range of personal-care, hair-care, beauty, oral-care and everyday products — developed around practical product purposes, consistent quality and everyday care. Explore the Albaik and Avora Shine collections and find products designed for different hair, skin and personal-care needs.",
                PrimaryCtaLabel = "Explore the Collections", PrimaryCtaHref = "/collections",
                SecondaryCtaLabel = "Our Product Approach", SecondaryCtaHref = "/about",
                DataJson = "{\"accentWord\":\"Pure Perfection.\",\"defaultBackdrop\":\"\"}",
                // The hero is a carousel. Each slide carries its own backdrop set, focal
                // point, headline (title + accent word), body and both CTAs, so an editor can
                // add, remove or reorder slides from the dashboard without a redeploy. The copy
                // here is the same approved wording that used to live on the single hero — do
                // not paraphrase. The slide badge and the site-name eyebrow were removed: they
                // restated the brand above the headline.
                //
                // Only the first slide has artwork, because only one banner campaign exists.
                // It is supplied as four art-directed compositions rather than one picture
                // cropped four ways, so the phone banner is a portrait composition and the
                // desktop one is not. Slides two and three deliberately fall through to the
                // royal gradient: with a default backdrop set they would all render the same
                // photo and the carousel would look static.
                // See docs/adr/0001-hero-backdrop-per-slide.md and
                // docs/adr/0007-hero-backdrop-per-breakpoint.md.
                SlidesJson = """
                [
                  {
                    "backdrop": "",
                    "backdrops": {
                      "ultrawide": "/hero-banner-ultrawide.webp",
                      "desktop": "/hero-banner-desktop.webp",
                      "tablet": "/hero-banner-tablet.webp",
                      "mobile": "/hero-banner-mobile.webp"
                    },
                    "focalPoint": "away-from-text",
                    "title": "The Mark of",
                    "accentWord": "Pure Perfection.",
                    "body": "Discover Albaik's range of personal-care, hair-care, beauty, oral-care and everyday products — developed around practical product purposes, consistent quality and everyday care.",
                    "primaryCtaLabel": "Explore the Collections",
                    "primaryCtaHref": "/collections",
                    "secondaryCtaLabel": "Our Product Approach",
                    "secondaryCtaHref": "/about"
                  },
                  {
                    "backdrop": "",
                    "focalPoint": "away-from-text",
                    "title": "Built Around",
                    "accentWord": "Real Needs.",
                    "body": "From everyday haircare to considered beauty and oral care, every product is matched to what it is designed to do — not a one-size-fits-all promise.",
                    "primaryCtaLabel": "Meet the brands",
                    "primaryCtaHref": "/collections",
                    "secondaryCtaLabel": "Our Approach",
                    "secondaryCtaHref": "/about"
                  },
                  {
                    "backdrop": "",
                    "focalPoint": "away-from-text",
                    "title": "Quality You",
                    "accentWord": "Can Trust.",
                    "body": "Appropriate raw materials, defined product functions, manufacturing requirements and clear information for proper use — the same standard across every collection.",
                    "primaryCtaLabel": "How we work",
                    "primaryCtaHref": "/about",
                    "secondaryCtaLabel": "Quality & verification",
                    "secondaryCtaHref": "/quality"
                  }
                ]
                """
            },
            new HomeSection
            {
                Key = "collections", SectionType = "collections", SortOrder = 2,
                Eyebrow = "The Albaik Portfolio",
                Title = "Collections Built Around Real Product Purpose",
                Subtitle = "Four collections, two brands. Choose a category to browse the brands and products inside it.",
                PrimaryCtaLabel = "View all products", PrimaryCtaHref = "/collections"
            },
            new HomeSection
            {
                Key = "signature-trio", SectionType = "featured-products", SortOrder = 3,
                Eyebrow = "Signature Formulations",
                Title = "Formulations for Every Hair and Scalp Need",
                Subtitle = "Whether you are cleansing after a deep oil treatment, nourishing dry and damaged-looking hair, or caring for a flaky scalp, select the shampoo matched to your need.",
                PrimaryCtaLabel = "See the full range", PrimaryCtaHref = "/collections/hair-care"
            },
            new HomeSection
            {
                Key = "product-approach", SectionType = "approach", SortOrder = 4,
                Eyebrow = "Our Approach",
                Title = "Purpose-Driven Formulation, Consistent Quality",
                Subtitle = "Every product should have a clear purpose. Albaik presents products according to what they are designed to do, how they should be used, and the quality requirements that support their intended function.",
                Body = "Our product approach begins with the formulation and intended purpose of each product. We focus on appropriate raw materials, defined product functions, manufacturing requirements, product stability, and clear information for proper use.",
                PrimaryCtaLabel = "Choosing the right shampoo", PrimaryCtaHref = "/guides/shampoo-guide",
                // The five pillars from docx §2 "Our Approach", verbatim and in source order.
                // They were already published on the About page but never surfaced here: the
                // section used to split `Body` into sentences instead, and because `Body` is a
                // single compound sentence that produced exactly one card. Do not paraphrase
                // these strings — they are approved copy.
                DataJson = "{\"pillars\":[\"Purpose-driven product formulations\",\"Quality-focused raw materials and manufacturing requirements\",\"Consistent formulation and manufacturing processes\",\"Clear and responsible product information\",\"Practical solutions for everyday personal care\"]}"
            },
            new HomeSection
            {
                Key = "testimonials", SectionType = "testimonials", SortOrder = 5,
                Eyebrow = "In the Market",
                Title = "Trusted Across Afghanistan",
                // Names only the channels docx §20 actually lists. The previous wording
                // ("verified wholesale hubs and official partner outlets") invented two
                // distribution channels and quietly claimed they were verified.
                Subtitle = "Albaik products are distributed through distributors, retailers, sales partners and market representatives across Afghanistan."
            },
            new HomeSection
            {
                Key = "distribution", SectionType = "distribution", SortOrder = 6,
                // Eyebrow and title are both verbatim docx §20 strings: the section
                // heading, and its "For Distributors & Retailers" subheading.
                //
                // The title used to read "Where to Buy Authentic Albaik Products" — the
                // nav label was corrected to "Distribution" (see the comment above), but
                // this section title kept the old promise. It readvertised a store
                // locator that does not exist, which is exactly the thing Habib objected
                // to. Do not reintroduce "Where to Buy" anywhere: there is no locator.
                Eyebrow = "For Distributors & Retailers",
                Title = "Distribution & Wholesale",
                Subtitle = "Albaik Group of Companies works with distributors, retailers, sales partners and market representatives to make its products available across target markets in Afghanistan.",
                PrimaryCtaLabel = "Become a distributor", PrimaryCtaHref = "/contact?topic=wholesale",
                SecondaryCtaLabel = "Contact us", SecondaryCtaHref = "/contact"
            }
        );

        db.HeroStats.AddRange(
            H("4", "Collections", 1, "gold"),
            H("2", "Brands", 2, null),
            H("20+", "Products", 3, "teal")
        );

        db.TrustPillars.AddRange(
            T("verified_user", "Consistent Quality", "Defined formulations and manufacturing requirements", "secondary", 1),
            T("science", "Verified Information", "Claims taken from approved product documentation", "primary", 2),
            T("local_shipping", "Nationwide Distribution", "Distributors and retailers across Afghanistan", "secondary", 3),
            T("workspace_premium", "Pure Perfection", "The Albaik standard across every product", "gold", 4)
        );

        db.HairProfiles.AddRange(
            P("dandruff", "spa", "Dandruff & Scalp Care", "Anti-Dandruff",
              "For dandruff-related scalp and hair care, with emphasis on cleansing, freshness and helping reduce dandruff.", "secondary", 1),
            P("oil", "water_drop", "Excess Oil & Impurities", "Purify & Cleanse",
              "Deep cleansing of the scalp and hair, with emphasis on excess oil, impurities, freshness and a lightweight feel.", "primary", 2),
            P("dry", "healing", "Dry, Weak or Damaged-Looking Hair", "Intense Repair",
              "Nourishment, softness, strength and natural-looking shine for dry, weak and damaged-looking hair.", "teal", 3),
            P("smooth", "auto_awesome", "Smoothness & Silky Feel", "Smooth & Silky",
              "Hair care focused on softness, smoothness and a silky-looking finish, with a distinctive Musk & Oud perfume experience.", "gold", 4),
            P("cool", "ac_unit", "Cooling & Refreshing", "Ice Cool Menthol",
              "A refreshing hair-care formula focused on cleansing and a cooling, invigorating feeling during washing.", "teal", 5),
            P("breakage", "shield", "Breakage-Prone or Weak Hair", "Anti-Breakage",
              "Strengthening support for weak and breakage-prone hair, featuring Biotin & Keratin.", "primary", 6)
        );

        // Testimonials are seeded INACTIVE on purpose — the source document contains no
        // approved customer reviews and inventing them would be misrepresentation.
        db.Testimonials.AddRange(
            new Testimonial { Name = "Add a real review", Role = "Enable this entry in the dashboard once you have written permission to publish it", Initials = "AR", Title = "\"Placeholder — not published\"", Quote = "This entry is a template. Replace it with a genuine, attributable customer review and switch it on.", Rating = 5, SortOrder = 1, IsActive = false },
            new Testimonial { Name = "Add a real review", Role = "Placeholder — not published", Initials = "AR", Title = "\"Placeholder — not published\"", Quote = "This entry is a template. Replace it with a genuine, attributable customer review and switch it on.", Rating = 5, SortOrder = 2, IsActive = false },
            new Testimonial { Name = "Add a real review", Role = "Placeholder — not published", Initials = "AR", Title = "\"Placeholder — not published\"", Quote = "This entry is a template. Replace it with a genuine, attributable customer review and switch it on.", Rating = 5, SortOrder = 3, IsActive = false }
        );

        // ---------------------------------------------------------------- catalogue
        var hair = new Category
        {
            Slug = "hair-care", Name = "Hair Care", NameDari = "مراقبت از مو", NamePashto = "د وېښتانو پاملرنه",
            Tagline = "Shampoo collections from Albaik and Avora Shine",
            Description = "The Albaik Beauty Collection brings together hair-care, facial-care, body-care and oral-care products designed for different everyday needs.",
            Icon = "spa", Accent = "primary", SortOrder = 1, ShowInNav = true
        };
        var skin = new Category
        {
            Slug = "skin-care", Name = "Skin Care", NameDari = "مراقبت از پوست", NamePashto = "د پوستکي پاملرنه",
            Tagline = "Face washes, beauty bars and creams",
            Description = "Facial-cleansing formulas and everyday beauty bars designed for different skincare needs.",
            Icon = "face", Accent = "secondary", SortOrder = 2, ShowInNav = true
        };
        var oral = new Category
        {
            Slug = "oral-care", Name = "Oral Care", NameDari = "مراقبت از دهان", NamePashto = "د خولې پاملرنه",
            Tagline = "Everyday oral-care essentials",
            Description = "Everyday oral-care products designed for routine tooth cleaning and daily hygiene.",
            Icon = "dentistry", Accent = "teal", SortOrder = 3, ShowInNav = true
        };
        var everyday = new Category
        {
            Slug = "everyday-essentials", Name = "Everyday Essentials", NameDari = "نیازهای روزمره", NamePashto = "ورځني اړتیاوې",
            Tagline = "Wider portfolio products",
            Description = "Albaik Rice 24.5 KG is part of the company's wider everyday product portfolio.",
            Icon = "inventory_2", Accent = "gold", SortOrder = 4, ShowInNav = true
        };
        db.Categories.AddRange(hair, skin, oral, everyday);
        await db.SaveChangesAsync();

        var albaikHair = new Brand { Slug = "albaik", Name = "Albaik", CategoryId = hair.Id, Tagline = "The Mark of Pure Perfection", Description = "The Albaik Shampoo Collection includes six focused formulas, allowing hair-care routines to be matched with different scalp and hair needs.", Accent = "primary", SortOrder = 1, IsFeatured = true };
        var avora = new Brand { Slug = "avora-shine", Name = "Avora Shine", CategoryId = hair.Id, Tagline = "Everyday hair care, defined by purpose", Description = "Avora Shine is a personal-care brand within the Albaik Group portfolio. Its hair-care range focuses on defined product purposes, formulation quality, practical care and everyday hair needs.", Accent = "secondary", SortOrder = 2, IsFeatured = true };
        var albaikSkin = new Brand { Slug = "albaik", Name = "Albaik", CategoryId = skin.Id, Tagline = "Daily skin care", Description = "Face washes, beauty bars and creams for everyday skin-care routines.", Accent = "secondary", SortOrder = 1 };
        var albaikOral = new Brand { Slug = "albaik", Name = "Albaik", CategoryId = oral.Id, Tagline = "Everyday oral care", Description = "Everyday oral-care products for routine hygiene.", Accent = "teal", SortOrder = 1 };
        var albaikEveryday = new Brand { Slug = "albaik", Name = "Albaik", CategoryId = everyday.Id, Tagline = "Wider portfolio", Description = "Products outside the core beauty ranges.", Accent = "gold", SortOrder = 1 };
        db.Brands.AddRange(albaikHair, avora, albaikSkin, albaikOral, albaikEveryday);
        await db.SaveChangesAsync();

        const string shampooUse = "Wet hair thoroughly. Apply an appropriate amount, massage gently into the scalp and hair, then rinse thoroughly. Follow the instructions and warnings on the approved product label.";
        const string extOnly = "For external use only; avoid contact with eyes. Rinse with clean water if contact occurs. Keep out of reach of children.";

        var products = new List<Product>
        {
            Prod("albaik-anti-dandruff-shampoo", "Albaik Anti-Dandruff Shampoo", "For dandruff-related scalp and hair care", "Aqua Soothing Complex",
                "For dandruff-related scalp and hair care, with emphasis on cleansing, freshness and helping reduce dandruff.",
                hair.Id, albaikHair.Id, "400 ML",
                new[] { "Helps reduce dandruff", "Cleanses the scalp and hair", "Supports a fresh, clean scalp feeling", "Helps maintain softness and natural-looking shine" },
                new[] { "Anti-Dandruff", "Scalp Care", "Fresh Feeling" },
                shampooUse, 1, true, "Flakes Cleansing", "teal"),

            Prod("albaik-purify-and-cleanse-shampoo", "Albaik Purify & Cleanse Shampoo", "Deep cleansing for scalp and hair", "Amethyst Balance Formula",
                "For deep cleansing of the scalp and hair, with emphasis on excess oil, impurities, freshness and a lightweight feel.",
                hair.Id, albaikHair.Id, "400 ML",
                new[] { "Deep cleansing", "Helps control excess oil", "Helps remove daily impurities and buildup", "Leaves a fresh and lightweight feel" },
                new[] { "Deep Cleanse", "Oil Control", "Lightweight" },
                shampooUse, 2, true, "Post-Oil Shield", "primary"),

            Prod("albaik-intense-repair-nourishing-shampoo", "Albaik Intense Repair & Nourishing Shampoo", "Nourishment for dry, weak, damaged-looking hair", "Gold Keratin System",
                "For dry, weak and damaged-looking hair, with emphasis on nourishment, softness, strength and natural-looking shine.",
                hair.Id, albaikHair.Id, "400 ML",
                new[] { "Provides intensive nourishment", "Helps strengthen weak-looking hair", "Helps reduce breakage associated with dryness and weakness", "Supports softness and natural-looking shine" },
                new[] { "Intensive Repair", "Nourishing", "Softness" },
                shampooUse, 3, true, "Restorative Elixir", "primary"),

            Prod("albaik-smooth-silky-musk-oud-shampoo", "Albaik Smooth & Silky with Musk & Oud Perfume Shampoo", "Softness, smoothness and a silky-looking finish", "Musk & Oud Perfume",
                "Hair care focused on softness, smoothness and a silky-looking finish, with a distinctive Musk & Oud perfume experience.",
                hair.Id, albaikHair.Id, "400 ML",
                new[] { "Helps provide a soft and smooth feel", "Helps hair look smoother and silkier", "Musk & Oud perfume", "Suitable for a regular hair-care routine" },
                new[] { "Smooth & Silky", "Musk & Oud", "Perfumed" },
                shampooUse, 4, false, "Signature Perfume", "gold"),

            Prod("albaik-ice-cool-menthol-shampoo", "Albaik Ice Cool Menthol Shampoo", "Refreshing cleansing with a cooling sensation", "Aqua Cooling Complex",
                "A refreshing hair-care formula focused on cleansing and a cooling, invigorating feeling during washing.",
                hair.Id, albaikHair.Id, "400 ML",
                new[] { "Refreshing cleansing care", "Cooling menthol sensation", "Fresh scalp feeling", "Suitable for a regular hair-care routine" },
                new[] { "Ice Cool", "Menthol", "Refreshing" },
                shampooUse, 5, false, "Cryo-Cooling", "teal"),

            Prod("albaik-anti-breakage-biotin-keratin-shampoo", "Albaik Anti-Breakage with Biotin & Keratin", "Strengthening support for breakage-prone hair", "Biotin & Keratin System",
                "Hair care focused on strengthening support for weak and breakage-prone hair, featuring Biotin & Keratin.",
                hair.Id, albaikHair.Id, "400 ML",
                new[] { "Helps support stronger-feeling hair", "Helps reduce the appearance of breakage", "Biotin & Keratin-focused care", "Supports softness and healthier-looking hair" },
                new[] { "Anti-Breakage", "Biotin", "Keratin" },
                shampooUse, 6, false, "Strength System", "primary"),

            Prod("avora-shine-olive-shampoo", "Avora Shine Olive Shampoo", "For dry and damaged hair", "Olive Care",
                "For dry and damaged hair, with emphasis on nourishment, softness, manageability and healthy-looking hair.",
                hair.Id, avora.Id, "400 ML",
                new[] { "Defined product-purpose care", "Daily cleansing and hair care", "Nourishment and softness" },
                new[] { "Olive", "Nourishing", "Daily Care" },
                shampooUse, 7, true, "Olive Care", "primary"),

            Prod("avora-shine-coconut-shampoo", "Avora Shine Coconut Shampoo", "For dry and frizzy hair", "Coconut Care",
                "For dry and frizzy hair, with emphasis on moisture support, softness, frizz-control support and manageability.",
                hair.Id, avora.Id, "400 ML",
                new[] { "Defined product-purpose care", "Daily cleansing and hair care", "Moisture support" },
                new[] { "Coconut", "Frizz Control", "Daily Care" },
                shampooUse, 8, false, "Coconut Care", "secondary"),

            Prod("avora-shine-mediterranean-shampoo", "Avora Shine Mediterranean Shampoo", "For all hair types", "Mediterranean Blend",
                "For all hair types, designed for versatile daily care, cleansing, freshness, softness and natural-looking shine.",
                hair.Id, avora.Id, "400 ML",
                new[] { "Defined product-purpose care", "Daily cleansing and hair care", "Versatile for all hair types" },
                new[] { "All Hair Types", "Freshness", "Daily Care" },
                shampooUse, 9, false, "Mediterranean Blend", "teal"),

            Prod("avora-shine-sandalwood-shampoo", "Avora Shine Sandalwood Shampoo", "For healthy and refreshed hair", "Sandalwood Care",
                "For healthy and refreshed hair, with emphasis on everyday cleansing, freshness, softness and a healthy-looking appearance.",
                hair.Id, avora.Id, "400 ML",
                new[] { "Defined product-purpose care", "Daily cleansing and hair care", "Freshness and softness" },
                new[] { "Sandalwood", "Refreshing", "Daily Care" },
                shampooUse, 10, false, "Sandalwood Care", "gold"),

            Prod("avora-shine-pro-v-repair-protect", "Avora Shine Pro-V Repair & Protect", "Repair and protection for damaged-looking hair", "Pro-V Repair System",
                "Repair- and protection-focused care for damaged-looking hair, with emphasis on strength, softness and support against everyday stress.",
                hair.Id, avora.Id, "400 ML",
                new[] { "Defined product-purpose care", "Daily cleansing and hair care", "Strength and protection" },
                new[] { "Pro-V", "Repair", "Protect" },
                shampooUse, 11, false, "Repair & Protect", "primary"),

            Prod("albaik-oil-cleansing-face-wash", "Albaik Oil Cleansing Face Wash", "Removes excess oil and daily impurities", "Daily Facial Cleansing",
                "Facial cleansing focused on removing excess oil and daily impurities while maintaining a clean, fresh skin feel.",
                skin.Id, albaikSkin.Id, null,
                new[] { "Daily facial cleansing", "Product purpose should be matched to the approved label and skin suitability", "Final ingredients and usage instructions must follow official product documentation" },
                new[] { "Oil Control", "Daily Cleansing" },
                "Use according to the approved product directions. For external use only.", 1, false, "Face Wash", "secondary"),

            Prod("albaik-anti-acne-face-wash", "Albaik Anti-Acne Face Wash", "Acne-focused daily cleansing", "Daily Facial Cleansing",
                "Facial cleansing designed for skin requiring acne-focused care, with emphasis on effective cleansing and a fresh skin feel.",
                skin.Id, albaikSkin.Id, null,
                new[] { "Daily facial cleansing", "Product purpose should be matched to the approved label and skin suitability", "Final ingredients and usage instructions must follow official product documentation" },
                new[] { "Acne Care", "Daily Cleansing" },
                "Use according to the approved product directions. For external use only.", 2, false, "Face Wash", "primary"),

            Prod("albaik-whitening-face-wash", "Albaik Whitening Face Wash", "Clean, fresh and brighter-looking appearance", "Daily Facial Cleansing",
                "Facial cleansing designed to support a clean, fresh and brighter-looking appearance.",
                skin.Id, albaikSkin.Id, null,
                new[] { "Daily facial cleansing", "Product purpose should be matched to the approved label and skin suitability", "Final ingredients and usage instructions must follow official product documentation" },
                new[] { "Brightening", "Daily Cleansing" },
                "Use according to the approved product directions. For external use only.", 3, false, "Face Wash", "gold"),

            Prod("albaik-original-beauty-bar", "Albaik Original Beauty Bar", "Everyday cleansing for hands and face", "Original Formula",
                "An everyday beauty bar for cleansing the hands and face, with a focus on clean, fresh and cared-for skin.",
                skin.Id, albaikSkin.Id, null,
                new[] { "Suitable for regular cleansing according to the approved label", "Fragrance and formulation details should match official product documentation", "Use according to approved directions" },
                new[] { "Everyday", "Cleansing" },
                "Use according to the approved product directions. For external use only.", 4, false, "Beauty Bar", "primary"),

            Prod("albaik-anti-stress-beauty-bar", "Albaik Anti-Stress Beauty Bar", "A refreshing, comfortable cleansing experience", "Anti-Stress Formula",
                "An everyday beauty bar designed around a refreshing cleansing experience and a comfortable skin feel.",
                skin.Id, albaikSkin.Id, null,
                new[] { "Suitable for regular cleansing according to the approved label", "Fragrance and formulation details should match official product documentation", "Use according to approved directions" },
                new[] { "Anti-Stress", "Cleansing" },
                "Use according to the approved product directions. For external use only.", 5, false, "Beauty Bar", "teal"),

            Prod("albaik-whitening-anti-acne-cream", "Albaik Whitening & Anti-Acne Cream", "Brightening-focused and acne-focused facial care", "Dual Action Cream",
                "A facial-care cream combining brightening-focused and acne-focused cosmetic care. Product claims and suitability should follow the approved formulation and label.",
                skin.Id, albaikSkin.Id, null,
                new[] { "Apply according to approved product directions", "Final ingredients and INCI must be verified from official documentation", "For external use only" },
                new[] { "Brightening", "Acne Care", "Facial Care" },
                "Apply according to the approved product directions. For external use only.", 6, false, "Cream", "gold"),

            Prod("albaik-multi-action-toothpaste", "Albaik Multi Action Toothpaste", "Everyday oral-care routine", "Multi Action",
                "A multi-action toothpaste designed for everyday oral-care routines. Its final benefits, ingredients, fluoride status and usage instructions must be presented exactly as approved on the product documentation.",
                oral.Id, albaikOral.Id, null,
                new[] { "Everyday oral care", "Benefits and fluoride status to be taken from approved documentation", "Use according to approved directions" },
                new[] { "Oral Care", "Daily Use" },
                "Use according to the approved product directions.", 1, false, "Oral Care", "teal"),

            Prod("albaik-toothbrush", "Albaik Toothbrush", "Routine tooth cleaning", "Everyday Design",
                "An everyday oral-care toothbrush designed for routine tooth cleaning. Bristle specifications and other technical details should be taken from the approved product specification.",
                oral.Id, albaikOral.Id, null,
                new[] { "Everyday oral care", "Bristle specifications to be taken from the approved product specification", "Replace according to the approved recommendation" },
                new[] { "Oral Care", "Everyday" },
                "Use according to the approved product directions.", 2, false, "Oral Care", "primary"),

            Prod("albaik-rice-24-5kg", "Albaik Rice — 24.5 KG", "Part of the wider everyday product portfolio", "Everyday Essentials",
                "Albaik Rice 24.5 KG is part of the company's wider everyday product portfolio. Product specifications, rice variety, origin, grade, packaging information, storage instructions and nutritional details must be published according to the approved product documentation.",
                everyday.Id, albaikEveryday.Id, "24.5 KG",
                new[] { "Part of the wider Albaik product portfolio", "Specifications, variety, origin and grade from approved documentation", "Storage instructions per the approved label" },
                new[] { "Everyday", "24.5 KG" },
                "Store according to the approved product documentation.", 1, false, "Everyday", "gold")
        };

        foreach (var p in products) p.SafetyNote = extOnly;
        db.Products.AddRange(products);
        await db.SaveChangesAsync();

        // ---------------------------------------------------------------- pages
        db.Pages.AddRange(
            Page("about", "About Albaik Group of Companies", "Personal care, hair care, beauty and everyday products", "Our Company",
                "<p>Albaik Group of Companies develops personal-care, beauty, hair-care, oral-care and everyday products with a focus on practical benefits, consistent quality and reliable product performance.</p>" +
                "<p>Our product approach begins with the formulation and intended purpose of each product. We focus on appropriate raw materials, defined product functions, manufacturing requirements, product stability and clear information for proper use.</p>" +
                "<h2>Our Approach</h2><ul>" +
                "<li>Purpose-driven product formulations</li>" +
                "<li>Quality-focused raw materials and manufacturing requirements</li>" +
                "<li>Consistent formulation and manufacturing processes</li>" +
                "<li>Clear and responsible product information</li>" +
                "<li>Practical solutions for everyday personal care</li></ul>" +
                "<h2>Our Product Philosophy</h2>" +
                "<p>Every product should have a clear purpose. Albaik presents products according to what they are designed to do, how they should be used, and the quality requirements that support their intended function.</p>", 1),

            Page("quality", "Product Quality & Verification", "Only verified product information is used for website claims", "Quality Focus",
                "<p>Albaik Group of Companies places emphasis on consistent product quality and accurate product information.</p>" +
                "<h2>Quality Focus</h2><ul>" +
                "<li>Appropriate raw-material specifications</li>" +
                "<li>Defined product formulations</li>" +
                "<li>Consistent manufacturing processes</li>" +
                "<li>Product stability and quality-control requirements</li>" +
                "<li>Accurate product labeling and usage information</li>" +
                "<li>Verification of approved ingredients and product specifications</li></ul>" +
                "<p><strong>Only verified product information should be used for final website claims, including ingredient lists, percentages, certifications, technical specifications and performance claims.</strong></p>", 2),

            Page("safety", "Product Safety", "Safe use, storage and handling", "Safety First",
                "<ul>" +
                "<li>For external use only unless the product label states otherwise.</li>" +
                "<li>Avoid contact with eyes; rinse with clean water if contact occurs.</li>" +
                "<li>Keep products out of reach of children.</li>" +
                "<li>Store in a cool, dry place away from direct sunlight unless otherwise stated on the label.</li>" +
                "<li>Do not use a product if its appearance, smell, color or consistency has changed abnormally.</li>" +
                "<li>Follow all warnings, directions, shelf-life information and other instructions on the approved label.</li></ul>" +
                "<p>Ingredient lists, warnings, shelf life, batch information, manufacturing details and regulatory statements should always be taken from the final approved product documentation.</p>", 3),

            Page("shampoo-guide", "Choosing the Right Albaik Shampoo", "Match the formula to your primary hair or scalp need", "Hair Rituals",
                "<p>Choose a shampoo according to your primary hair or scalp need:</p><ul>" +
                "<li><strong>Dandruff or scalp-care needs</strong> → Albaik Anti-Dandruff Shampoo</li>" +
                "<li><strong>Excess oil and impurities</strong> → Albaik Purify &amp; Cleanse Shampoo</li>" +
                "<li><strong>Dry, weak or damaged-looking hair</strong> → Albaik Intense Repair &amp; Nourishing Shampoo</li>" +
                "<li><strong>Smoothness and a silky feel</strong> → Albaik Smooth &amp; Silky with Musk &amp; Oud Perfume Shampoo</li>" +
                "<li><strong>Cooling and refreshing sensation</strong> → Albaik Ice Cool Menthol Shampoo</li>" +
                "<li><strong>Breakage-prone or weak hair</strong> → Albaik Anti-Breakage with Biotin &amp; Keratin</li></ul>", 4),

            Page("how-to-use", "Correct Shampoo Usage", "How to get the most from every wash", "Usage Guide",
                "<ul>" +
                "<li>Wet the hair and scalp completely before application.</li>" +
                "<li>Use an appropriate amount for hair length and density.</li>" +
                "<li>Massage gently into the scalp and hair; avoid aggressive rubbing.</li>" +
                "<li>Rinse thoroughly with clean water.</li>" +
                "<li>Follow the approved label instructions for the specific product.</li>" +
                "<li>Close the product properly after use and store it as directed.</li></ul>", 5),

            Page("distribution", "Distribution & Wholesale", "Work with Albaik Group of Companies", "Partner With Us",
                "<p>Albaik Group of Companies works with distributors, retailers, sales partners and market representatives to make its products available across target markets in Afghanistan.</p>" +
                "<h2>For Distributors &amp; Retailers</h2><ul>" +
                "<li>Product availability and wholesale supply</li>" +
                "<li>Territory-based distribution opportunities</li>" +
                "<li>Marketing and product-support materials</li>" +
                "<li>Commercial terms according to approved company policy</li></ul>" +
                "<h2>Wholesale Information</h2><ul>" +
                "<li>Minimum order quantity: available on request</li>" +
                "<li>Wholesale pricing: available on request</li>" +
                "<li>Delivery and logistics terms: according to approved company policy</li></ul>", 6),

            Page("privacy", "Privacy Policy", "How we handle the information you send us", "Legal",
                "<p>This placeholder page should be reviewed and replaced with Albaik Group's approved privacy policy before launch.</p>", 7),

            Page("terms", "Terms of Use", "Terms governing use of this website", "Legal",
                "<p>This placeholder page should be reviewed and replaced with Albaik Group's approved terms of use before launch.</p>", 8)
        );

        // ---------------------------------------------------------------- admin user
        db.AdminUsers.Add(new AdminUser
        {
            Username = adminUser,
            DisplayName = "Albaik Administrator",
            Email = "admin@albaik-group.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = "Admin"
        });

        await db.SaveChangesAsync();
        logger.LogInformation("Seed complete: {Products} products, {Categories} categories, {Brands} brands.",
            products.Count, 4, 5);
    }

    // ------------------------------------------------------------------ helpers

    private static SiteSetting S(string key, string value, string group, string label, string input = "text")
        => new() { Key = key, Value = value, Group = group, Label = label, InputType = input, SortOrder = 0 };

    private static NavLink N(string label, string path, int order)
        => new() { Label = label, Path = path, SortOrder = order };

    private static FooterLink F(string group, string label, string path, int order)
        => new() { Group = group, Label = label, Path = path, SortOrder = order };

    private static QuickLink Q(string label, string path, int order)
        => new() { Label = label, Path = path, SortOrder = order };

    private static HeroStat H(string value, string label, int order, string? accent)
        => new() { Value = value, Label = label, SortOrder = order, Accent = accent };

    private static TrustPillar T(string icon, string title, string subtitle, string accent, int order)
        => new() { Icon = icon, Title = title, Subtitle = subtitle, Accent = accent, SortOrder = order };

    private static HairProfile P(string key, string icon, string title, string badge, string description, string style, int order)
        => new() { Key = key, Icon = icon, Title = title, Badge = badge, BadgeStyle = style, Description = description, SortOrder = order };

    private static Page Page(string slug, string title, string subtitle, string eyebrow, string html, int order)
        => new() { Slug = slug, Title = title, Subtitle = subtitle, Eyebrow = eyebrow, ContentHtml = html, MetaDescription = subtitle, SortOrder = order };

    private static Product Prod(string slug, string name, string subtitle, string formulation, string shortDesc,
        int categoryId, int brandId, string? size, string[] benefits, string[] ingredients,
        string howToUse, int order, bool featured, string badge, string accent)
        => new()
        {
            Slug = slug, Name = name, Subtitle = subtitle, FormulationLabel = formulation,
            ShortDescription = shortDesc, Description = shortDesc,
            CategoryId = categoryId, BrandId = brandId, Size = size,
            Benefits = benefits.ToList(), Ingredients = ingredients.ToList(),
            HowToUse = howToUse, SortOrder = order, IsFeatured = featured,
            Badge = badge, BadgeStyle = accent,
            Rating = null, ReviewCount = 0,
            StockStatus = "InStock",
            // Every product owns one verification code from birth; the unique index needs
            // a distinct value per row, and a printed QR must never be minted twice.
            VerificationCode = VerificationCodes.New(),
            AccentFrom = AccentHex(accent, true), AccentTo = AccentHex(accent, false)
        };

    private static string AccentHex(string accent, bool from) => accent switch
    {
        "primary" => from ? "#050d24" : "#0e3b9c",
        "secondary" => from ? "#0e3b9c" : "#1a4fcf",
        "teal" => from ? "#003337" : "#008891",
        "gold" => from ? "#8a6d1f" : "#d4af37",
        _ => from ? "#050d24" : "#0e3b9c"
    };
}
