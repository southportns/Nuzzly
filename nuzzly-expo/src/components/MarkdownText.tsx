import { Text, StyleSheet, View } from 'react-native';
import { colors, typography } from '../theme/tokens';

interface MarkdownTextProps {
  content: string;
  style?: any;
}

export default function MarkdownText({ content, style }: MarkdownTextProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <View style={[styles.container, style]}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={idx} style={styles.paragraphSpacer} />;

        // Heading: # ## ###
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          return (
            <Text
              key={idx}
              style={[
                styles.heading,
                level === 1 && styles.h1,
                level === 2 && styles.h2,
                level === 3 && styles.h3,
              ]}
            >
              {parseInline(headingMatch[2])}
            </Text>
          );
        }

        // List item
        if (/^[-*•]\s+/.test(trimmed)) {
          return (
            <Text key={idx} style={styles.listItem}>
              <Text style={styles.bullet}>• </Text>
              {parseInline(trimmed.replace(/^[-*•]\s+/, ''))}
            </Text>
          );
        }

        // Blockquote
        if (/^>\s*/.test(trimmed)) {
          return (
            <View key={idx} style={styles.blockquote}>
              <Text style={styles.blockquoteText}>
                {parseInline(trimmed.replace(/^>\s*/, ''))}
              </Text>
            </View>
          );
        }

        // Horizontal rule
        if (/^---+$/.test(trimmed)) {
          return <View key={idx} style={styles.hr} />;
        }

        return (
          <Text key={idx} style={styles.paragraph}>
            {parseInline(trimmed)}
          </Text>
        );
      })}
    </View>
  );
}

function parseInline(text: string) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Bold **text** or __text__
  const boldRegex = /(\*\*|__)(.*?)\1/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={key++} style={styles.text}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={key++} style={styles.bold}>
        {match[2]}
      </Text>
    );
    remaining = remaining.replace(match[0], '');
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={key++} style={styles.text}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  if (parts.length === 0) {
    parts.push(<Text key={key++}>{text}</Text>);
  }

  return parts;
}

const styles = StyleSheet.create({
  container: {
    flexWrap: 'wrap',
  },
  paragraph: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    color: colors.muted,
    marginBottom: 10,
  },
  paragraphSpacer: {
    height: 8,
  },
  text: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    color: colors.muted,
  },
  bold: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.fg,
  },
  heading: {
    fontWeight: '700',
    color: colors.fg,
    marginTop: 8,
    marginBottom: 4,
  },
  h1: {
    fontSize: typography.sizes.lg,
  },
  h2: {
    fontSize: typography.sizes.md,
  },
  h3: {
    fontSize: typography.sizes.base,
  },
  listItem: {
    fontSize: typography.sizes.base,
    lineHeight: 24,
    color: colors.muted,
    marginBottom: 4,
    paddingLeft: 8,
  },
  bullet: {
    color: '#FF7A59',
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: '#FF7A59',
    paddingLeft: 12,
    marginVertical: 8,
  },
  blockquoteText: {
    fontSize: typography.sizes.base,
    lineHeight: 22,
    color: '#6B6B6B',
  },
  hr: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
});
