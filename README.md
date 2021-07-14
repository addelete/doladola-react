# doladola web client by react

[server](https://github.com/addelete/doladola-socket)
[web](https://github.com/addelete/doladola-react)

## dev
```
yarn dev
```

## prod
### step 1
create `.umirc.build.ts` and eidt it
```ts
import { defineConfig } from 'umi';

export default defineConfig({
  define: {
    SOCKET_URI: `server url`,
  },
})
```
### step 2
```
yarn build
```
