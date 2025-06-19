import type { MDXComponents } from 'mdx/types'
import { MDXImage, MDXVideo } from '@/components'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Override default img and video tags to prevent layout thrashing
    img: (props) => (
      <MDXImage 
        src={props.src || ''} 
        alt={props.alt || ''} 
        width={props.width as number}
        height={props.height as number}
        className={props.className}
      />
    ),
    video: (props) => (
      <MDXVideo 
        src={props.src || ''} 
        width={props.width as number}
        height={props.height as number}
        className={props.className}
        autoPlay={props.autoPlay !== false} // Default to true unless explicitly false
        loop={props.loop !== false} // Default to true unless explicitly false
        muted={props.muted !== false} // Default to true unless explicitly false
        playsInline={props.playsInline !== false} // Default to true unless explicitly false
        controls={props.controls === true} // Default to false unless explicitly true
      />
    ),
    ...components,
  }
} 