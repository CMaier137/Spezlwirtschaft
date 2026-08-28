interface Props {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
}

export default function StarRating({ value, onChange, readOnly }: Props) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className="star-btn"
          disabled={readOnly}
          aria-label={`${n} Sterne`}
          onClick={() => onChange?.(n)}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill={n <= value ? '#c76a1f' : 'none'}
            stroke={n <= value ? '#c76a1f' : '#d6d0c4'}
            strokeWidth="1.3"
            strokeLinejoin="round"
          >
            <path d="M12 2.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z" />
          </svg>
        </button>
      ))}
    </div>
  )
}
