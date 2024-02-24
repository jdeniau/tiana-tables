import { Link } from 'react-router-dom';
import { Button } from 'antd';

export function Home() {
  return (
    <div>
      <p>Tiana Tables ! </p>

      <Button type="primary">
        <Link to="/connect">Please connect</Link>
      </Button>
    </div>
  );
}
