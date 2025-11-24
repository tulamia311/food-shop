import { useTranslation } from 'react-i18next'
import { useCart } from '../context/CartContext'

function MenuGrid() {
  const { t, i18n } = useTranslation()
  const { menuItems, addItem } = useCart()

  const currency = new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  })

  const getLocalizedDescription = (item) => {
    const lang = i18n.resolvedLanguage || i18n.language || 'en'
    const shortLang = lang.split('-')[0]

    // 1. Try exact match in JSONB
    if (item.description_i18n?.[lang]) return item.description_i18n[lang]
    // 2. Try short language code in JSONB (e.g. 'de' from 'de-DE')
    if (item.description_i18n?.[shortLang]) return item.description_i18n[shortLang]
    // 3. Fallback to English in JSONB
    if (item.description_i18n?.['en']) return item.description_i18n['en']
    // 4. Fallback to old text column
    if (item.description) return item.description
    // 5. Fallback to any key in JSONB
    if (item.description_i18n && Object.keys(item.description_i18n).length > 0) {
      return Object.values(item.description_i18n)[0]
    }
    return ''
  }

  return (
    <div className="menu-grid">
      {menuItems
        .filter((item) => !!item)
        .map((item) => {
          const numericPrice = Number.isFinite(item?.price) ? item.price : Number(item?.price) || 0
          const tags = Array.isArray(item?.tags) ? item.tags : []
          const description = getLocalizedDescription(item)

          return (
            <article key={item.id ?? item.name} className="menu-card">
              <header>
                <span className="menu-emoji" aria-hidden>
                  {item.emoji}
                </span>
                <div>
                  <h3>{item.name}</h3>
                  <p className="menu-description">{description}</p>
                </div>
              </header>

              <div className="menu-meta">
                <div>
                  <p className="menu-price">{currency.format(numericPrice)}</p>
                  <ul className="menu-tags">
                    {tags.length === 0 ? <li>{t('menu.tag_fresh')}</li> : tags.map((tag) => <li key={tag}>{tag}</li>)}
                  </ul>
                </div>
                <button type="button" className="ghost-button" onClick={() => addItem(item.id)}>
                  {t('menu.add_to_cart')}
                </button>
              </div>
            </article>
          )
        })}
    </div>
  )
}

export default MenuGrid
