# Internationalization (i18n) Implementation

## 1. Introduction

**Problem:**
The Food Shop application was originally built with hardcoded English text and a database schema that only supported English descriptions. To expand the market to German-speaking customers, we needed to translate the entire user interface and support multilingual content for menu items.

**Importance:**
Providing a localized experience builds trust with customers and ensures they understand what they are ordering (especially ingredients and prices), which is critical for a food delivery service.

## 2. Solution Overview

We implemented a full-stack internationalization strategy:

1.  **Frontend Labels (Static Text):**
    *   We chose **`react-i18next`** as the translation library.
    *   All static text (buttons, headers, labels) was extracted into JSON files (`locales/en.json` and `locales/de.json`).
    *   A language switcher was added to the global header.

2.  **Database Content (Dynamic Text):**
    *   Instead of creating separate tables or columns for every language (e.g., `description_en`, `description_de`), we used a **PostgreSQL `JSONB` column**.
    *   This allows flexible storage of translations: `{"en": "Pretzel", "de": "Brezel"}`.

3.  **System Enums:**
    *   Critical business logic fields like `payment_status` ('paid', 'pending') remain in **English** in the database.
    *   These are only translated at the *presentation layer* (in the UI) to prevent breaking backend logic.

## 3. Workflow & Component Interaction

### Architecture

The system handles translations in two distinct ways:

```mermaid
flowchart TD
    User[User selects Language (DE)] --> App
    App --> i18n[i18n Instance]

    subgraph Static_Content [Static UI Labels]
        i18n -->|Loads| DE_JSON[de.json]
        DE_JSON -->|Translates| Header[Header / Buttons]
        DE_JSON -->|Translates| Checkout[Checkout Form]
    end

    subgraph Dynamic_Content [Database Content]
        App -->|Fetches| DB[(Supabase DB)]
        DB -->|Returns JSONB| MenuItem
        MenuItem -->|Contains| Desc[description_i18n: {en: "...", de: "..."}]

        Desc -->|Logic Check| MenuGrid
        MenuGrid -->|Prefer DE| Display["Anzeige: Deutsche Beschreibung"]
    end
```

### Admin Interface Workflow

The Admin interface was updated to be **multilingual-aware**:

1.  **Reading:** It displays both English and German descriptions.
    *   If the Admin's interface is in **German**, the German description is shown first (bold), with English secondary.
    *   If in **English**, the order is reversed.
2.  **Writing:** Admins can edit both fields simultaneously.
3.  **Saving:** The frontend combines both fields into a single JSON object (`{en: ..., de: ...}`) and saves it to the `description_i18n` column.

## 4. Lessons Learned

### Challenges
*   **Database Migration:** Changing a live database is risky. We avoided data loss by **adding** a new column (`description_i18n`) instead of modifying the existing `description` column. This provided a safe fallback if the migration failed.
*   **Visual Clutter:** Showing multiple languages in the Admin table can be messy. We solved this by using dynamic sorting and styling (greying out the non-active language) to keep the UI clean.

### What Went Well
*   **`i18next` Integration:** The library made it very easy to handle pluralization and interpolation (e.g., "Order #123 saved").
*   **JSONB Flexibility:** Using JSONB means we don't need to run new database migrations if we decide to add French or Italian later. We just add a new key to the JSON.

## 5. References

*   [react-i18next Documentation](https://react.i18next.com/)
*   [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
