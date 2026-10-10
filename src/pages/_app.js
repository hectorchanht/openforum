import { ChakraProvider } from '@chakra-ui/react'
import React from 'react'
import { initAnalytics } from '../libs/analytics'
import theme from '../libs/theme'

function MyApp({ Component, pageProps }) {
  // PostHog init — client-side only (initAnalytics is a no-op during SSR).
  React.useEffect(() => {
    initAnalytics()
  }, [])

  return (
    <ChakraProvider theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default MyApp
