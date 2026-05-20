import { FaSearch } from 'react-icons/fa'
import { useTranslation } from 'react-i18next'

function SearchBar({ value, onChange, placeholder }) {
  const { t } = useTranslation()
  return (
    <div className="search-bar">
      <FaSearch className="search-icon" />
      <input
        type="text"
        placeholder={placeholder || t('search.placeholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      <style>{`
        .search-bar {
          position: relative;
          max-width: 500px;
          margin: 0 auto;
        }
        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #9aa0a6;
        }
        .search-bar input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          border: 2px solid #dadce0;
          border-radius: 12px;
          font-size: 1rem;
          transition: border-color 0.3s;
        }
        .search-bar input:focus {
          outline: none;
          border-color: #1a73e8;
        }
      `}</style>
    </div>
  )
}

export default SearchBar