import { TouchableOpacity, StyleSheet, TouchableOpacityProps } from 'react-native';
import { ThemedText } from './themed-text';

interface HeaderButtonProps extends TouchableOpacityProps {
  title: string;
}

export function HeaderButton({ title, style, ...rest }: HeaderButtonProps) {
  return (
    <TouchableOpacity style={[styles.button, style]} {...rest}>
      <ThemedText type="link" style={styles.text}>{title}</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
  },
});
