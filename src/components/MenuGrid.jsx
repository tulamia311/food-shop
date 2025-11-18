import { useCart } from '../context/CartContext'

function MenuGrid() {
  const { menuItems, addItem } = useCart()

  return (
    <div className="menu-grid">
      {menuItems
        .filter((item) => !!item)
        .map((item) => {
          const numericPrice = Number.isFinite(item?.price) ? item.price : Number(item?.price) || 0
          const tags = Array.isArray(item?.tags) ? item.tags : []

          return (
            <article key={item.id ?? item.name} className="menu-card">
              <header>
                <span className="menu-emoji" aria-hidden>
                  {item.emoji}
                </span>
                <div>
                  <h3>{item.name}</h3>
                  <p className="menu-description">{item.description}</p>
                </div>
              </header>

              <div className="menu-meta">
                <div>
                  <p className="menu-price">€{numericPrice.toFixed(2)}</p>
                  <ul className="menu-tags">
                    {tags.length === 0 ? <li>fresh</li> : tags.map((tag) => <li key={tag}>{tag}</li>)}
                  </ul>
                </div>
                <button type="button" className="ghost-button" onClick={() => addItem(item.id)}>
                  Add to cart
                </button>
              </div>
            </article>
          )
        })}
    </div>
  )
}

export default MenuGrid
