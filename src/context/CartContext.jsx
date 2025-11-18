import { createContext, useContext, useMemo, useReducer } from 'react'
import defaultMenuItems from '../data/menuItems'

const CartContext = createContext()

const initialState = {
  items: {},
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const currentQty = state.items[action.payload] ?? 0
      return {
        ...state,
        items: {
          ...state.items,
          [action.payload]: currentQty + 1,
        },
      }
    }
    case 'UPDATE_ITEM': {
      const { id, quantity } = action.payload
      if (quantity <= 0) {
        const { [id]: _, ...rest } = state.items
        return { ...state, items: rest }
      }
      return {
        ...state,
        items: {
          ...state.items,
          [id]: quantity,
        },
      }
    }
    case 'REMOVE_ITEM': {
      const { [action.payload]: _, ...rest } = state.items
      return { ...state, items: rest }
    }
    case 'CLEAR_CART':
      return initialState
    default:
      return state
  }
}

export function CartProvider({ children, menuItems = defaultMenuItems }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  const cartLines = useMemo(() => {
    return Object.entries(state.items)
      .map(([id, quantity]) => {
        const item = menuItems.find((menuItem) => menuItem.id === id)
        if (!item) {
          return null
        }
        return {
          ...item,
          quantity,
          lineTotal: item.price * quantity,
        }
      })
      .filter(Boolean)
  }, [state.items, menuItems])

  const subtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0)

  const value = {
    menuItems,
    cartLines,
    subtotal,
    addItem: (id) => dispatch({ type: 'ADD_ITEM', payload: id }),
    updateItem: (id, quantity) => dispatch({ type: 'UPDATE_ITEM', payload: { id, quantity } }),
    removeItem: (id) => dispatch({ type: 'REMOVE_ITEM', payload: id }),
    clearCart: () => dispatch({ type: 'CLEAR_CART' }),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
