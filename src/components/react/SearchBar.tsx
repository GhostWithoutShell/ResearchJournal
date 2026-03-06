import { useStore } from '@nanostores/react';
import { $searchQuery } from '../../stores/ui';

export default function SearchBar() {
  const searchQuery = useStore($searchQuery);

  return (
    <div className="search-bar">
      <input
        type="text"
        className="form-input"
        placeholder="search ideas..."
        value={searchQuery}
        onChange={(e) => $searchQuery.set(e.target.value)}
      />
    </div>
  );
}
