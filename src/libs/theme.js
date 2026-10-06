import { extendTheme } from '@chakra-ui/react';

// Dark-first, glassy, modern OpenMic theme.
// Violet → fuchsia brand gradient, rounded-2xl surfaces, generous touch targets.
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  fonts: {
    heading:
      `'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`,
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? '#0b0b14' : 'gray.50',
        color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
      },
      // subtle dotted background texture
      '#__next': {
        backgroundImage:
          props.colorMode === 'dark'
            ? 'radial-gradient(circle at 15% 0%, rgba(139,92,246,0.12), transparent 45%), radial-gradient(circle at 85% 10%, rgba(217,70,239,0.08), transparent 40%)'
            : 'none',
        minHeight: '100dvh',
      },
    }),
  },
  layerStyles: {
    glass: {
      bg: 'whiteAlpha.50',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid',
      borderColor: 'whiteAlpha.100',
      borderRadius: '2xl',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    },
  },
  textStyles: {
    brandGradient: {
      bgGradient: 'linear(to-r, #a78bfa, #e879f9)',
      bgClip: 'text',
      fontWeight: 'extrabold',
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'xl',
        fontWeight: 'semibold',
      },
      defaultProps: {
        colorScheme: 'purple',
      },
    },
    IconButton: {
      baseStyle: {
        borderRadius: 'xl',
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            borderRadius: 'xl',
            _focus: {
              borderColor: 'purple.400',
            },
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Textarea: {
      variants: {
        filled: {
          borderRadius: 'xl',
          _focus: {
            borderColor: 'purple.400',
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Select: {
      variants: {
        filled: {
          field: {
            borderRadius: 'xl',
          },
        },
      },
      defaultProps: {
        variant: 'filled',
        size: 'sm',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '2xl',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'md',
        textTransform: 'none',
      },
    },
  },
});

export default theme;
