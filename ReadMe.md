# Simple API mocking tool

This tool helps developers to continue their task independently of API availability. Developer just need to route all there API request through this tool and it will cache the response and return mocked response in case of errors.

### Uses

- install api-mock-proxy

  `npm install -g api-mock-proxy`

- now you can run your mock proxy as

  `api-mock-proxy -p 8000 -t http://your.api.com`

  now your proxy server is ready at http://localhost:8000. Just use this URL in all client and you will get the response from http://your.api.com. Best part is, it will return mocked response if actual api is not working.

### Available Options

- `port or -p: (default:8080)` -
  To specify the port to which mock server will listen

- `targetUrl or -t: (default:http://localhost:80)` -
  To specify the target url where mock server will forward all requests and return the response back. This will be URL for your actual api and mock server will save the response for mocking when api respond with error

- `errorCodes or -e: (default:*)` -
  this will provide options for mocking on errors, error code will be provided in comma separated list like `404,500,ECONNREFUSED`. Default value is `*` which means it will return mocked response for any error unless mode in not record.

- `mode or -m: (default:mix)` -
  It can take any of the three values mock|record|mix

  mock: mock all the request no need to call actual api

  record: always return response from actual api and create cache for future mocking

  mix: Call the actual api and return actual response except error code passed as mockedError

- `dataPath or -d: (default:./data.json)` -
  path for the mock data, it should be a valid data file.
  For first time just specify the path and mock will be created at that location.
  For running in mock mode there must be pre populated mock data.

- `--cors` -
  use this to enable cors header for all origin, methods and headers

- `allowOrigin` -
  provide string to be used in response header 'Access-Control-Allow-Origin'

- `allowMethods` -
  provide string to be used in response header 'Access-Control-Allow-Methods'

- `allowHeaders` -
  provide string to be used in response header 'Access-Control-Allow-Headers'

##### Do not use this for data verification or performance testing
