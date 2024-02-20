import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div>
      <p>Welcome to Fuzzy Potato ! </p>

      <Link to="/connect">Please connect</Link>
    </div>
  );
}
