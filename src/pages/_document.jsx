import { ColorModeScript } from '@chakra-ui/react'
import NextDocument, { Html, Head, Main, NextScript } from 'next/document'

export default class Document extends NextDocument {
  render() {
    return (
      <Html lang='en'>
        <Head>
          <meta name="theme-color" content="#000000" />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        </Head>
        <body>
          <ColorModeScript initialColorMode={'dark'} />
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
