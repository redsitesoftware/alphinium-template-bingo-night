/**
 * SpectatorScreen — Watch a bingo game without a card.
 * Shows the real-time call ticker, current call, and win announcements.
 * Intended for event displays/screens — no daubing, no card issued.
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Animated,
} from 'react-native';
import { useBingoStore } from '../store/bingoStore';
import { colors, spacing, radius, typography } from '../theme';

export default function SpectatorScreen() {
  const { calledItems, wins, sessionCode, resetGame } = useBingoStore();
  const scrollRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const latestCall = calledItems[calledItems.length - 1] ?? null;
  const latestWin = wins.length > 0 ? wins[wins.length - 1] : null;

  // Pulse the call banner whenever a new item is called
  useEffect(() => {
    if (!latestCall) return;
    Animated.sequence([
      Animated.spring(pulseAnim, { toValue: 1.06, useNativeDriver: true, tension: 200, friction: 5 }),
      Animated.spring(pulseAnim, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  }, [latestCall]);

  // Auto-scroll the ticker to the bottom as new calls arrive
  useEffect(() => {
    if (scrollRef.current && calledItems.length > 0) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [calledItems.length]);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.spectatorBadge}>👁️ SPECTATOR</Text>
            <Text style={s.roomCode}>Room: {sessionCode}</Text>
          </View>
          <View style={s.callCount}>
            <Text style={s.callCountNum}>{calledItems.length}</Text>
            <Text style={s.callCountLabel}>called</Text>
          </View>
        </View>

        {/* Win announcement */}
        {latestWin && (
          <View style={[s.winBanner, latestWin === 'FULL HOUSE' && s.winBannerFull]}>
            <Text style={s.winEmoji}>{latestWin === 'FULL HOUSE' ? '🏆' : '🎉'}</Text>
            <Text style={s.winText}>
              {latestWin === 'FULL HOUSE' ? 'FULL HOUSE!' : `BINGO — ${latestWin}!`}
            </Text>
            <Text style={s.winSub}>
              {wins.length} win{wins.length !== 1 ? 's' : ''} so far
            </Text>
          </View>
        )}

        {/* Current call banner */}
        <Animated.View style={[s.callBanner, { transform: [{ scale: pulseAnim }] }]}>
          {latestCall ? (
            <>
              <Text style={s.callLabel}>NOW CALLING</Text>
              <Text style={s.callText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.4}>
                {latestCall}
              </Text>
            </>
          ) : (
            <>
              <Text style={s.callLabel}>BINGO NIGHT</Text>
              <Text style={s.callText} numberOfLines={1}>Waiting to start…</Text>
              <Text style={s.callSub}>The host hasn't called yet</Text>
            </>
          )}
        </Animated.View>

        {/* Called items ticker */}
        {calledItems.length > 0 && (
          <View style={s.tickerContainer}>
            <Text style={s.tickerTitle}>
              Called Numbers ({calledItems.length})
            </Text>
            <ScrollView
              ref={scrollRef}
              style={s.tickerScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {[...calledItems].reverse().map((item, idx) => (
                <View
                  key={calledItems.length - 1 - idx}
                  style={[s.tickerRow, idx === 0 && s.tickerRowLatest]}
                >
                  <Text style={s.tickerIndex}>
                    #{calledItems.length - idx}
                  </Text>
                  <Text
                    style={[s.tickerItem, idx === 0 && s.tickerItemLatest]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                  {idx === 0 && (
                    <View style={s.latestBadge}>
                      <Text style={s.latestBadgeText}>LATEST</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Leave button */}
        <TouchableOpacity style={s.leaveBtn} onPress={resetGame}>
          <Text style={s.leaveBtnText}>Leave Game</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.bg },
  content:          { padding: spacing.md, paddingTop: spacing.lg, flexGrow: 1 },

  header:           {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  spectatorBadge:   {
    fontSize: 11, color: colors.accentPurple,
    textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700',
  },
  roomCode:         { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  callCount:        {
    alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  callCountNum:     { fontSize: 22, fontWeight: '900', color: colors.primary },
  callCountLabel:   { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

  winBanner:        {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#10B98122', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.green,
    padding: spacing.md, marginBottom: spacing.md,
  },
  winBannerFull:    { backgroundColor: '#F5C51822', borderColor: colors.primary },
  winEmoji:         { fontSize: 24 },
  winText:          { fontSize: 18, fontWeight: '800', color: colors.green, flex: 1 },
  winSub:           { fontSize: 11, color: colors.textMuted },

  callBanner:       {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.primary + '66',
    padding: spacing.xl, alignItems: 'center',
    marginBottom: spacing.md, minHeight: 120,
    justifyContent: 'center',
  },
  callLabel:        {
    fontSize: 10, color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 2, marginBottom: spacing.sm,
  },
  callText:         {
    fontSize: 32, fontWeight: '900', color: colors.primary,
    textAlign: 'center', lineHeight: 38,
  },
  callSub:          { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },

  tickerContainer:  {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
    padding: spacing.md, marginBottom: spacing.md, flex: 1,
  },
  tickerTitle:      {
    fontSize: 11, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  tickerScroll:     { maxHeight: 300 },
  tickerRow:        {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
    gap: spacing.sm,
  },
  tickerRowLatest:  { borderBottomColor: colors.primary + '44' },
  tickerIndex:      { fontSize: 11, color: colors.textMuted, width: 28, textAlign: 'right' },
  tickerItem:       { fontSize: 14, color: colors.textSub, flex: 1 },
  tickerItemLatest: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  latestBadge:      {
    backgroundColor: colors.primary + '22', borderRadius: radius.round,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.primary + '55',
  },
  latestBadgeText:  { fontSize: 9, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },

  leaveBtn:         { alignItems: 'center', paddingVertical: spacing.lg },
  leaveBtnText:     { color: colors.textMuted, fontSize: 14 },
});
