export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? 'brand-small' : ''}`}>
      <span className="brand-mark">
        <img src="/icons/icon-64.png" alt="" width="38" height="38" />
      </span>
      <span>
        chef<span className="brand-light"> / </span>grdn<span className="brand-period">.</span>
      </span>
    </span>
  );
}
