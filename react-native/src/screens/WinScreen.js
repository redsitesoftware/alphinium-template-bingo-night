/**
 * WinScreen — Celebrate a line win; option to continue for full house
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated } from 'react-native';
import { useBingoStore } from '../store/bingoStore';
import { colors, spacing, radius, typography } from '../theme';

export default function WinScreen() {
  const { wins, continueAfterWin, resetGame, playerName, dauberColor } = useBingoStore();
  const bounceAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.spring(bounceAnim, {
      toValue: 1, tension: 60, friction: 5, useNativeDriver: true,
    }).start();
  }, []);

  const latestWin = wins[wins.length - 1] || 'Line';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.content}>
        <Animated.View style={[s.card, { transform: [{ scale: bounceAnim }] }]}>
          <Text style={s.emoji}>🎉</Text>
          <Text style={s.title}>BINGO!</Text>
          <Text style={[s.winType, { color: dauberColor }]}>{latestWin}</Text>
          <Text style={s.name}>{playerName} got a {latestWin.toLowerCase()}!</Text>
        </Animated.View>

        <TouchableOpacity style={s.continueBtn} onPress={continueAfterWin}>
          <Text style={s.continueBtnText}>Keep Playing — Go for Full House!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.endBtn} onPress={resetGame}>
          <Text style={s.endBtnText}>Claim Victory & End Game</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  content:        { flex: 1, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  card:           {
    backgroundColor: colors.card, borderRadius: radius.xl,
    borderWidth: 3, borderColor: colors.primary,
    padding: spacing.xxl, alignItems: 'center', marginBottom: spacing.xxl, width: '100%',
  },
  emoji:          { fontSize: 80, marginBottom: spacing.md },
  title:          { fontSize: 56, fontWeight: '900', color: colors.primary, letterSpacing: 4 },
  winType:        { fontSize: 24, fontWeight: '800', marginVertical: spacing.sm },
  name:           { ...typography.body, color: colors.textSub, textAlign: 'center' },
  continueBtn:    {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', width: '100%', marginBottom: spacing.md,
  },
  continueBtnText: { color: colors.black, fontSize: 16, fontWeight: '800' },
  endBtn:         { alignItems: 'center', padding: spacing.md },
  endBtnText:     { color: colors.textMuted, fontSize: 15 },
});
