/**
 * CardScreen — Shows the player's 5x5 bingo card + current call + caller controls
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Animated, Modal,
} from 'react-native';
import { useBingoStore } from '../store/bingoStore';
import { colors, spacing, radius, typography } from '../theme';

// AI caller quips — rotate through these for variety
const HOST_QUIPS = {
  office: [
    "And the call is... let's circle back on that one!",
    "Please action this item on your card!",
    "This one's a synergy opportunity!",
    "Reaching out with this next one!",
    "Taking this offline — onto your card!",
  ],
  xmas: [
    "Santa's calling from the North Pole!",
    "Jingle all the way to this one!",
    "Ho ho ho — here comes the next one!",
    "Mrs Claus approved this call!",
    "The elves have been working overtime on this one!",
  ],
  aussie: [
    "Crikey, here she comes!",
    "No worries — next one up!",
    "Ripper! Here's your next call!",
    "She'll be right — mark that one!",
    "Fair dinkum, this one's a beauty!",
  ],
  tech: [
    "Deploying this call to production!",
    "No downtime — here's the next one!",
    "This one passed all the tests!",
    "Merging to main — mark it!",
    "Zero bugs on this call — probably!",
  ],
  classic: [
    "Eyes down, here we go!",
    "And the next number is...",
    "Lucky dip time!",
    "Here she comes!",
    "On its own!",
  ],
};

function BingoSquare({ item, index, isMarked, isLatest, dauberColor, onPress }) {
  const isFree = item === 'FREE';
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isMarked && !isFree) {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start();
    }
  }, [isMarked]);

  const bgColor = isFree
    ? colors.primary + '44'
    : isMarked
    ? dauberColor + 'CC'
    : colors.card;

  const borderColor = isLatest
    ? colors.primary
    : isMarked
    ? dauberColor
    : colors.cardBorder;

  // Truncate long labels for the card
  const shortLabel = isFree ? '★ FREE' : item.length > 12 ? item.substring(0, 11) + '…' : item;

  return (
    <TouchableOpacity onPress={() => onPress(index)} activeOpacity={0.7}
      style={[s.square, { backgroundColor: bgColor, borderColor, borderWidth: isLatest || isMarked ? 2 : 1 }]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={[s.squareText, isMarked && s.squareTextMarked, isFree && s.squareFree]}
          numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
          {shortLabel}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function CardScreen() {
  const {
    card, marked, dauberColor, calledItems, isHost,
    sessionCode, playerName, themeId, isCalling, callerInterval, startAutoCalling, stopAutoCalling, resetGame,
    ws, winner, dismissWinner,
  } = useBingoStore();
  const toggleAudioMuted = useBingoStore(s => s.toggleAudioMuted);
  const audioMuted = useBingoStore(s => s.audioMuted);
  const isReconnecting = useBingoStore(s => s.isReconnecting ?? false);

  const [currentCall, setCurrentCall] = useState('');
  const [quip, setQuip] = useState('Eyes down — let\'s play Bingo! 🎱');
  const [quipIndex, setQuipIndex] = useState(0);
  const [selectedInterval, setSelectedInterval] = useState(10);
  const [countdown, setCountdown] = useState(null);
  const daubeSquare = useBingoStore(s => s.daubeSquare);
  const wins = useBingoStore(s => s.wins);

  // Update current call display when calledItems changes (driven by WS)
  useEffect(() => {
    if (calledItems.length === 0) return;
    const latest = calledItems[calledItems.length - 1];
    setCurrentCall(latest);
    const quips = HOST_QUIPS[themeId] || HOST_QUIPS.classic;
    setQuip(quips[quipIndex % quips.length]);
    setQuipIndex(i => i + 1);
    // Reset countdown to full interval on each new call
    if (isCalling) setCountdown(callerInterval);
  }, [calledItems.length]);

  // Countdown timer: start/stop based on isCalling
  useEffect(() => {
    if (!isCalling) {
      setCountdown(null);
      return;
    }
    setCountdown(callerInterval);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) return callerInterval; // wrap back (server will call next)
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isCalling, callerInterval]);

  // Auto-calling: tell the server to start/stop
  const handleAutoCallerToggle = () => {
    if (!ws) return;
    if (isCalling) {
      ws.send(JSON.stringify({ type: 'stop-auto-caller', payload: { code: sessionCode } }));
      stopAutoCalling();
    } else {
      ws.send(JSON.stringify({ type: 'start-auto-caller', payload: { code: sessionCode, interval: selectedInterval } }));
      startAutoCalling();
    }
  };

  const handleSkip = () => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'skip-call', payload: { code: sessionCode } }));
    setCountdown(callerInterval);
  };

  const handleManualCall = () => {
    if (!ws) return;
    ws.send(JSON.stringify({ type: 'call-number', payload: { code: sessionCode } }));
  };

  const latestCalledItem = calledItems[calledItems.length - 1];

  return (
    <SafeAreaView style={s.safe}>
      {winner && (
        <Modal transparent animationType="fade">
          <View style={s.modalBackdrop}>
            <View style={s.winnerCard}>
              <Text style={s.winnerEmoji}>🏆</Text>
              <Text style={s.winnerName}>{winner.winnerName}</Text>
              <Text style={s.winnerType}>{winner.winType}</Text>
              {winner.prize ? <Text style={s.winnerPrize}>Prize: {winner.prize}</Text> : null}
              <TouchableOpacity onPress={dismissWinner} style={s.winnerDismiss}>
                <Text style={s.winnerDismissText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <ScrollView contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.playerName}>{playerName}</Text>
            <Text style={s.roomCode}>Room: {sessionCode}</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={toggleAudioMuted} style={s.muteBtn} accessibilityLabel={audioMuted ? 'Unmute audio' : 'Mute audio'}>
              <Text style={s.muteBtnText}>{audioMuted ? '🔇' : '🔊'}</Text>
            </TouchableOpacity>
            <View style={[s.dauberPreview, { backgroundColor: dauberColor }]} />
          </View>
        </View>

        {/* Current Call Banner */}
        <View style={s.callBanner}>
          {currentCall ? (
            <>
              <Text style={s.callLabel}>CALLED</Text>
              <Text style={s.callText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>
                {currentCall}
              </Text>
              <Text style={s.quipText}>{quip}</Text>
            </>
          ) : (
            <>
              <Text style={s.callLabel}>BINGO NIGHT</Text>
              <Text style={s.callText} numberOfLines={1}>Eyes down! 👀</Text>
              <Text style={s.quipText}>{isHost ? 'Press Call Next to start' : 'Waiting for the caller...'}</Text>
            </>
          )}
          {isCalling && countdown !== null && (
            <Text style={s.countdownText}>Next call in {countdown}s</Text>
          )}
        </View>

        {/* Bingo Card */}
        {wins.length > 0 && (
          <View style={s.winBanner}>
            <Text style={s.winText}>🎉 {wins[wins.length - 1]}!</Text>
          </View>
        )}

        <Text style={s.cardTitle}>Your Card — tap to daub!</Text>
        <View style={s.grid}>
          {/* Column headers */}
          {['B','I','N','G','O'].map(l => (
            <View key={l} style={s.colHeader}>
              <Text style={s.colHeaderText}>{l}</Text>
            </View>
          ))}
          {/* Squares */}
          {card.map((item, idx) => (
            <BingoSquare
              key={idx}
              item={item}
              index={idx}
              isMarked={marked.has(idx)}
              isLatest={item === latestCalledItem}
              dauberColor={dauberColor}
              onPress={daubeSquare}
            />
          ))}
        </View>

        {/* Called items log */}
        {calledItems.length > 0 && (
          <View style={s.log}>
            <Text style={s.logTitle}>Called ({calledItems.length})</Text>
            <Text style={s.logItems} numberOfLines={3}>
              {[...calledItems].reverse().slice(0, 8).join(' · ')}
            </Text>
          </View>
        )}

        {/* Host controls */}
        {isHost && (
          <View style={s.hostControls}>
            {/* Interval picker — shown always, disabled while calling */}
            <View style={s.intervalRow}>
              <Text style={s.intervalLabel}>Interval:</Text>
              {[5, 10, 15, 20, 30, 60].map(sec => (
                <TouchableOpacity
                  key={sec}
                  onPress={() => setSelectedInterval(sec)}
                  disabled={isCalling}
                  style={[s.intervalChip, selectedInterval === sec && s.intervalChipActive, isCalling && s.intervalChipDisabled]}>
                  <Text style={[s.intervalChipText, selectedInterval === sec && s.intervalChipTextActive]}>{sec}s</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Call buttons row */}
            <View style={s.controls}>
              <TouchableOpacity style={s.callBtn} onPress={handleManualCall} disabled={isCalling || !ws}>
                <Text style={s.callBtnText}>Call Next</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.autoBtn, isCalling && s.autoBtnActive]}
                onPress={handleAutoCallerToggle}>
                <Text style={s.autoBtnText}>{isCalling ? '⏸ Pause Auto' : '▶ Auto Call'}</Text>
              </TouchableOpacity>
              {isCalling && (
                <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
                  <Text style={s.skipBtnText}>⏭ Skip</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity style={s.resetBtn} onPress={resetGame}>
          <Text style={s.resetBtnText}>End Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLS = 5;
const GAP = 4;

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  content:        { padding: spacing.md, paddingTop: spacing.lg },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  playerName:     { ...typography.subhead, color: colors.text },
  roomCode:       { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  muteBtn:        { padding: 6 },
  muteBtnText:    { fontSize: 22 },
  dauberPreview:  { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.white },

  callBanner:     {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.primary + '55',
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md,
    minHeight: 100,
  },
  callLabel:      { fontSize: 10, color: colors.primary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  callText:       { fontSize: 26, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  quipText:       { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },

  winBanner:      {
    backgroundColor: '#10B98133', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.green,
    padding: spacing.md, alignItems: 'center', marginBottom: spacing.md,
  },
  winText:        { fontSize: 20, fontWeight: '800', color: colors.green },

  cardTitle:      { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },

  grid:           {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: GAP, marginBottom: spacing.md,
  },
  colHeader:      {
    width: `${(100 - GAP * 4 / 5) / 5}%`,
    alignItems: 'center', paddingVertical: 4,
  },
  colHeaderText:  { fontSize: 18, fontWeight: '900', color: colors.primary },
  square:         {
    width: `${(100 - GAP * 4 / 5) / 5}%`,
    height: 80,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center', padding: 4,
    backgroundColor: colors.card,
  },
  squareText:     { fontSize: 9, color: colors.textSub, textAlign: 'center', fontWeight: '600' },
  squareTextMarked: { color: colors.white, fontWeight: '700' },
  squareFree:     { fontSize: 11, fontWeight: '900', color: colors.primary },

  log:            {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  logTitle:       { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  logItems:       { fontSize: 12, color: colors.textSub, lineHeight: 18 },

  controls:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  callBtn:        {
    flex: 2, backgroundColor: colors.primary, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
  },
  callBtnText:    { color: colors.black, fontSize: 16, fontWeight: '800' },
  autoBtn:        {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary,
    padding: spacing.md, alignItems: 'center',
  },
  autoBtnActive:  { backgroundColor: colors.accent + '33', borderColor: colors.accent },
  autoBtnText:    { color: colors.primary, fontSize: 13, fontWeight: '700' },

  hostControls:   { marginBottom: spacing.md },
  intervalRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  intervalLabel:  { fontSize: 12, color: colors.textMuted, marginRight: 4 },
  intervalChip:   {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  intervalChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  intervalChipDisabled: { opacity: 0.4 },
  intervalChipText:   { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  intervalChipTextActive: { color: colors.black },
  skipBtn:        {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accent,
    padding: spacing.md, alignItems: 'center', justifyContent: 'center',
  },
  skipBtnText:    { color: colors.accent, fontSize: 13, fontWeight: '700' },
  countdownText:  { fontSize: 12, color: colors.textMuted, marginTop: 6, fontWeight: '600' },

  resetBtn:       { alignItems: 'center', paddingVertical: spacing.md },
  resetBtnText:   { color: colors.textMuted, fontSize: 14 },

  modalBackdrop:    {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl,
  },
  winnerCard:       {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.primary,
    padding: spacing.xxl, alignItems: 'center', width: '100%', maxWidth: 360,
  },
  winnerEmoji:      { fontSize: 56, marginBottom: spacing.md },
  winnerName:       { ...typography.title, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  winnerType:       { fontSize: 16, color: colors.primary, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm },
  winnerPrize:      { fontSize: 15, color: colors.textSub, textAlign: 'center', marginBottom: spacing.lg },
  winnerDismiss:    {
    marginTop: spacing.md, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
  },
  winnerDismissText: { color: colors.black, fontSize: 16, fontWeight: '800' },
});
