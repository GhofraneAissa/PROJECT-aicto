function Card({ title, description, category, country, type, onClick }) {
  return (
    <div className="card" onClick={onClick}>
      {category && <span className="badge badge-primary">{category}</span>}
      {type && <span className="badge badge-success">{type}</span>}
      {country && <span className="badge badge-warning">{country}</span>}
      <h3 className="card-title">{title}</h3>
      {description && <p className="card-desc">{description}</p>}

      <style>{`
        .card-title {
          margin: 16px 0 8px;
          font-size: 1.2rem;
          color: #202124;
        }
        .card-desc {
          color: #5f6368;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  )
}

export default Card