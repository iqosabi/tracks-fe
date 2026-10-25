import { responseContext } from '../data/response-context';
export function ResponseContext({ payload }: { payload: unknown }) {
  const values = responseContext(payload);
  return values.length ? (
    <dl className="response-context">
      {values.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  ) : null;
}
