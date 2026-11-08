export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? 'brand-small' : ''}`}>
      <span className="brand-mark">
        <img src="/icons/icon-64.png" alt="" width="38" height="38" />
      </span>
      <span>Chef GRDN</span>
    </span>
  );
}
