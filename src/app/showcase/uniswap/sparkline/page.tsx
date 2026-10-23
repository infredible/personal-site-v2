import type { Metadata } from 'next'
import { SparklineShowcase } from './SparklineShowcase'

export const metadata: Metadata = {
  title: 'Price sparkline',
  description:
    "A recreation of the mini price chart beside Uniswap's swap box: the live card with scrubbing and periods, and a canvas of its parts and states.",
}

export default function SparklineShowcasePage() {
  return <SparklineShowcase />
}
