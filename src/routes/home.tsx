import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div>
      <p>Welcome to Tiana Tables ! </p>

      <Link to="/connect">Please connect</Link>
    </div>
  );
}
