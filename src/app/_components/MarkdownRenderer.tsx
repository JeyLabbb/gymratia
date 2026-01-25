'use client'

import React from 'react'

/**
 * Simple markdown renderer for chat messages
 * Supports: **bold**, `code`, *italic*, ### headers, and line breaks
 */
export function MarkdownRenderer({ content }: { content: string }) {
  // Split by headers first (###)
  const parts: React.ReactNode[] = []
  let key = 0
  let currentIndex = 0

  // Handle headers (###)
  const headerRegex = /^###\s+(.+)$/gm
  const headerMatches: Array<{ index: number; text: string }> = []
  let match

  while ((match = headerRegex.exec(content)) !== null) {
    headerMatches.push({
      index: match.index,
      text: match[1]
    })
  }

  // If there are headers, split content by headers
  if (headerMatches.length > 0) {
    for (let i = 0; i < headerMatches.length; i++) {
      const headerMatch = headerMatches[i]
      const nextHeaderIndex = i < headerMatches.length - 1 ? headerMatches[i + 1].index : content.length
      
      // Add text before header
      if (headerMatch.index > currentIndex) {
        const textBefore = content.substring(currentIndex, headerMatch.index)
        parts.push(...renderInlineMarkdown(textBefore, key))
        key += 1000
      }
      
      // Add header
      parts.push(
        <h4
          key={key++}
          className="font-heading font-bold text-[#F8FAFC] text-base mt-4 mb-2 first:mt-0"
        >
          {headerMatch.text}
        </h4>
      )
      
      // Add content after header (until next header or end)
      const headerEndIndex = headerMatch.index + headerMatch.text.length + 4 // +4 for "### "
      const textAfter = content.substring(headerEndIndex, nextHeaderIndex)
      parts.push(...renderInlineMarkdown(textAfter, key))
      key += 1000
      
      currentIndex = nextHeaderIndex
    }
    
    // Add remaining text after last header
    if (currentIndex < content.length) {
      const remainingText = content.substring(currentIndex)
      parts.push(...renderInlineMarkdown(remainingText, key))
    }
  } else {
    // No headers, handle code blocks and inline markdown
    const codeRegex = /`([^`]+)`/g
    currentIndex = 0

    while ((match = codeRegex.exec(content)) !== null) {
      // Add text before code
      if (match.index > currentIndex) {
        const textBefore = content.substring(currentIndex, match.index)
        parts.push(...renderInlineMarkdown(textBefore, key))
        key += 1000
      }
      
      // Add code
      parts.push(
        <code
          key={key++}
          className="bg-[rgba(255,255,255,0.1)] px-1.5 py-0.5 rounded text-xs font-mono text-[#FF2D2D]"
        >
          {match[1]}
        </code>
      )
      
      currentIndex = match.index + match[0].length
    }

    // Add remaining text
    if (currentIndex < content.length) {
      const remainingText = content.substring(currentIndex)
      parts.push(...renderInlineMarkdown(remainingText, key))
    }
  }

  // If no code blocks or headers, render inline markdown for entire content
  if (parts.length === 0) {
    return <>{renderInlineMarkdown(content, 0)}</>
  }

  return <>{parts}</>
}

function renderInlineMarkdown(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let key = startKey
  let currentIndex = 0

  // Handle bold (**text**)
  const boldRegex = /\*\*([^*]+)\*\*/g
  const matches: Array<{ index: number; length: number; text: string }> = []
  
  let match
  while ((match = boldRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      text: match[1]
    })
  }

  // Handle italic (*text*)
  const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g
  const italicMatches: Array<{ index: number; length: number; text: string }> = []
  
  while ((match = italicRegex.exec(text)) !== null) {
    italicMatches.push({
      index: match.index,
      length: match[0].length,
      text: match[1]
    })
  }

  // Combine and sort all matches
  const allMatches = [
    ...matches.map(m => ({ ...m, type: 'bold' as const })),
    ...italicMatches.map(m => ({ ...m, type: 'italic' as const }))
  ].sort((a, b) => a.index - b.index)

  // Remove overlapping matches (bold takes precedence)
  const filteredMatches: Array<{ index: number; length: number; text: string; type: 'bold' | 'italic' }> = []
  for (const match of allMatches) {
    const overlaps = filteredMatches.some(
      existing => 
        (match.index >= existing.index && match.index < existing.index + existing.length) ||
        (existing.index >= match.index && existing.index < match.index + match.length)
    )
    if (!overlaps) {
      filteredMatches.push(match)
    }
  }

  // Render text with formatting
  let lastPos = 0
  for (const match of filteredMatches) {
    // Add text before match
    if (match.index > lastPos) {
      const beforeText = text.substring(lastPos, match.index)
      if (beforeText) {
        parts.push(
          <span key={key++}>{beforeText}</span>
        )
      }
    }

    // Add formatted text
    if (match.type === 'bold') {
      parts.push(
        <strong key={key++} className="font-semibold">
          {match.text}
        </strong>
      )
    } else {
      parts.push(
        <em key={key++} className="italic">
          {match.text}
        </em>
      )
    }

    lastPos = match.index + match.length
  }

  // Add remaining text
  if (lastPos < text.length) {
    const remaining = text.substring(lastPos)
    if (remaining) {
      parts.push(
        <span key={key++}>{remaining}</span>
      )
    }
  }

  return parts.length > 0 ? parts : [<span key={key}>{text}</span>]
}

