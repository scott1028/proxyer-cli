# proxy-cli

```
[Options]
    -d, --dist: ex: -d="/ http://localhost /api/ https://localhost /api2/ https://localhost/v2" or read by Proxyfile.
    -s, --ssl: default is false (optional)
    -p, --port: default is 80 (optional)

[Usage]
    $ proxyer -s -d "/ http://localhost /api/ https://localhost" -p 8443
```

# Proxyfile

```
/versions/ https://example1.com/api
/api/ http://example2.com
```

# Example

![Alt text](https://raw.githubusercontent.com/scott1028/proxy-cli/master/example.png "example.png")
