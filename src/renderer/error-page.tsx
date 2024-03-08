import { Link, useRouteError } from 'react-router-dom';
import Debug from './component/Debug';

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div id="error-page">
      <Debug />
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        {/* @ts-expect-error error might have one of tjose */}
        <i>{error.statusText || error.message}</i>
      </p>

      <Link to="/">Go back to the home page</Link>
    </div>
  );
}
