import { Result } from 'antd';
import { Link } from 'react-router-dom';

const PageNotFound = () => {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist."
      extra={
        <Link type="link" to="/">
          Back Home
        </Link>
      }
    />
  );
};

export default PageNotFound;
