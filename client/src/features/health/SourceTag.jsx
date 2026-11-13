// Where a number comes from (owner: Habiba): measured, self-reported, estimated or simulated. Always a word.
import { SOURCE } from './healthModel.js';
import s from './styles.module.css';

// Sample ("simulated") numbers show no tag. The other three do.
export default function SourceTag({ kind }) {
  if (kind === 'simulated') return null;
  return <span className={`${s.tag} ${s[`tag_${kind}`] || ''}`}>{SOURCE[kind] ?? kind}</span>;
}
