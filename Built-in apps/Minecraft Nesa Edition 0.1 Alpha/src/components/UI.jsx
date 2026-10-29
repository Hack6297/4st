import { useStore } from '../store/useStore'
import './UI.css'

const images = {
  grass: 'https://opengameart.org/sites/default/files/grass_0.png',
  dirt: 'https://cdn-icons-png.flaticon.com/512/2748/2748558.png',
  stone: 'https://cdn-icons-png.flaticon.com/512/2748/2748574.png',
  wood: 'https://cdn-icons-png.flaticon.com/512/2748/2748575.png',
  sand: 'https://cdn-icons-png.flaticon.com/512/2748/2748570.png',
  glass: 'https://cdn-icons-png.flaticon.com/512/2748/2748568.png',
}

export default function UI() {
  const [texture, resetWorld] = useStore((state) => [
    state.texture,
    state.resetWorld,
  ])

  return (
    <div className="ui">
      <div className="info-panel">
        <h3>⛏️ Minecraft React ⛏️</h3>
        <p>
          <strong>WASD:</strong> Move<br />
          <strong>Mouse:</strong> Look around<br />
          <strong>Space:</strong> Jump<br />
          <strong>Click:</strong> Add block<br />
          <strong>Alt + Click:</strong> Remove block<br />
          <strong>1-6:</strong> Select blocks
        </p>
        <button onClick={resetWorld} className="reset-btn">
          Reset World
        </button>
      </div>

      <div className="texture-selector">
        <div className="selected-block">
          Selected: <span className="texture-name">{texture}</span>
        </div>
        <div className="texture-grid">
          {Object.keys(images).map((key, index) => (
            <div
              key={key}
              className={`texture-item ${texture === key ? 'active' : ''}`}
            >
              <div
                className="texture-box"
                style={{
                  background: getBlockColor(key),
                }}
              />
              <span className="texture-key">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getBlockColor(type) {
  const colors = {
    grass: '#7CFC00',
    dirt: '#8B4513',
    stone: '#808080',
    wood: '#DEB887',
    sand: '#F4A460',
    glass: '#87CEEB',
  }
  return colors[type] || '#666'
}
