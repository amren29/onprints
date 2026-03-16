'use client'

/**
 * Wrapper for the proof page under /s/[slug]/products/[productSlug]/proof
 * Re-maps [productSlug] param to [slug] for the original ProofPage component
 */
import { use } from 'react'
import ProofPage from '@/app/store/products/[slug]/proof/page'

export default function SlugProofPage({ params }: { params: Promise<{ slug: string; productSlug: string }> }) {
  const { productSlug } = use(params)
  // Pass productSlug as the "slug" param that ProofPage expects
  return <ProofPage params={Promise.resolve({ slug: productSlug })} />
}
