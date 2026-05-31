/**
 * FullHouseScreen — Full house win celebration
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useBingoStore } from '../store/bingoStore';
import { colors, spacing, radius, typography } from '../theme';

export default function FullHouseScreen() {
  const { resetGame, playerName, calledItems } = useBingoStore();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }).start();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Animated.View style={[s.card, { transform: [{ scale: anim }], opacity: anim }]}>
          <Text style={s.confetti}>🏆🎊🎉🎊🏆</Text>
          <Text style={s.title}>FULL HOUSE!</Text>
          <Text style={s.subtitle}>{playerName} wins!</Text>
          <Text style={s.stats}>{calledItems.length} calls · Complete card!</Text>
        </Animated.View>

        <TouchableOpacity style={s.btn} onPress={resetGame}>
          <Text style={s.btnText}>Play Again 🎱</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.bg },
  content:  { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  card:     {
    backgroundColor: colors.card, borderRadius: radius.xl,
    borderWidth: 3, borderColor: colors.primary,
    padding: spacing.xxl, alignItems: 'center', marginBottom: spacing.xxl, width: '100%',
  },
  confetti: { fontSize: 40, marginBottom: spacing.md },
  title:    { fontSize: 48, fontWeight: '900', color: colors.primary, letterSpacing: 3, textAlign: 'center' },
  subtitle: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  stats:    { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  btn:      {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  btnText:  { color: colors.black, fontSize: 18, fontWeight: '800' },
});
