function hashColor(str) {
  const colors = ['#4a9eff','#4caf50','#ff9800','#e91e63','#9c27b0','#00bcd4','#ff5722']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function Avatar({ name = '', size = 36, className = '' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const bg = hashColor(name)
  return (
    <div
      className={`flex items-center justify-center rounded-full shrink-0 select-none font-semibold text-white ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials || '?'}
    </div>
  )
}
