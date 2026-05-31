/**
 * HomeScreen — Bingo Night landing: host or join
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useBingoStore, THEMES } from '../store/bingoStore';
import { colors, spacing, radius, typography } from '../theme';

export default function HomeScreen() {
  const [mode, setMode] = useState('home');
  const [name, setName] = useState('');
  const [themeId, setThemeId] = useState('office');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [dauber, setDauber] = useState(colors.daubers[0]);
  const { startAsHost, joinAsPlayer, setDauber: storeDauber } = useBingoStore();

  const handleHost = () => {
    storeDauber(dauber);
    startAsHost(name.trim(), themeId);
  };

  const handleJoin = () => {
    storeDauber(dauber);
    joinAsPlayer(joinCode, joinName.trim(), themeId);
  };

  if (mode === 'host') {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
          <ScrollView contentContainerStyle={s.content}>
            <TouchableOpacity onPress={() => setMode('home')} style={s.back}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.bigEmoji}>🎙️</Text>
            <Text style={s.title}>Host a Game</Text>
            <Text style={s.sub}>You call the numbers — everyone marks their cards</Text>

            <Text style={s.label}>Your name</Text>
            <TextInput style={s.input} placeholder="e.g. Barry the Caller"
              placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} autoFocus />

            <Text style={s.label}>Theme</Text>
            <View style={s.themeRow}>
              {THEMES.map(t => (
                <TouchableOpacity key={t.id}
                  style={[s.themePill, themeId === t.id && s.themePillActive]}
                  onPress={() => setThemeId(t.id)}>
                  <Text style={s.themeEmoji}>{t.emoji}</Text>
                  <Text style={[s.themeLabel, themeId === t.id && s.themeLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Dauber colour</Text>
            <View style={s.dauberRow}>
              {colors.daubers.map(c => (
                <TouchableOpacity key={c} style={[s.dauberDot, { backgroundColor: c }, dauber === c && s.dauberActive]}
                  onPress={() => setDauber(c)} />
              ))}
            </View>

            <TouchableOpacity style={[s.btn, !name.trim() && s.btnDisabled]}
              disabled={!name.trim()} onPress={handleHost}>
              <Text style={s.btnText}>Generate Cards & Start 🎱</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (mode === 'join') {
    return (
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
          <ScrollView contentContainerStyle={s.content}>
            <TouchableOpacity onPress={() => setMode('home')} style={s.back}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.bigEmoji}>🎟️</Text>
            <Text style={s.title}>Join a Game</Text>
            <Text style={s.sub}>Enter the room code from your caller</Text>

            <Text style={s.label}>Room code</Text>
            <TextInput style={[s.input, s.codeInput]} placeholder="e.g. B4NG"
              placeholderTextColor={colors.textMuted} value={joinCode}
              onChangeText={t => setJoinCode(t.toUpperCase())} maxLength={4}
              autoCapitalize="characters" autoFocus />

            <Text style={s.label}>Your name</Text>
            <TextInput style={s.input} placeholder="e.g. Margaret"
              placeholderTextColor={colors.textMuted} value={joinName} onChangeText={setJoinName} />

            <Text style={s.label}>Dauber colour</Text>
            <View style={s.dauberRow}>
              {colors.daubers.map(c => (
                <TouchableOpacity key={c} style={[s.dauberDot, { backgroundColor: c }, dauber === c && s.dauberActive]}
                  onPress={() => setDauber(c)} />
              ))}
            </View>

            <TouchableOpacity
              style={[s.btn, s.btnSecondary, (!joinCode.trim() || !joinName.trim()) && s.btnDisabled]}
              disabled={!joinCode.trim() || !joinName.trim()} onPress={handleJoin}>
              <Text style={s.btnText}>Join Game →</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.hero}>
          <Text style={s.heroEmoji}>🎱✨</Text>
          <Text style={s.heroTitle}>Bingo Night</Text>
          <Text style={s.heroSub}>AI-hosted bingo for pubs, events, and corporate nights.{'\n'}Everyone plays on their phone.</Text>
        </View>

        <View style={s.features}>
          {[
            { emoji: '🤖', text: 'AI caller with themed quips and banter' },
            { emoji: '🎨', text: 'Pick your theme — office, Christmas, Aussie slang and more' },
            { emoji: '📱', text: 'Every player gets a unique card on their phone' },
            { emoji: '🏆', text: 'Line, four corners, or full house to win' },
          ].map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={s.featureEmoji}>{f.emoji}</Text>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.btn} onPress={() => setMode('host')}>
          <Text style={s.btnText}>🎙️ Host a Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => setMode('join')}>
          <Text style={s.btnText}>🎟️ Join with Code</Text>
        </TouchableOpacity>
        <Text style={s.demoNote}>Demo mode — no account required</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  flex:           { flex: 1 },
  content:        { padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1 },
  back:           { marginBottom: spacing.xl },
  backText:       { color: colors.primary, fontSize: 16 },
  hero:           { alignItems: 'center', marginBottom: spacing.xxl },
  heroEmoji:      { fontSize: 60, marginBottom: spacing.md },
  heroTitle:      { ...typography.title, color: colors.primary, textAlign: 'center', marginBottom: spacing.sm },
  heroSub:        { ...typography.body, color: colors.textSub, textAlign: 'center', lineHeight: 24 },
  features:       { marginBottom: spacing.xxl },
  featureRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  featureEmoji:   { fontSize: 24, width: 36 },
  featureText:    { ...typography.body, color: colors.textSub, flex: 1 },
  bigEmoji:       { fontSize: 48, textAlign: 'center', marginBottom: spacing.md },
  title:          { ...typography.title, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  sub:            { ...typography.body, color: colors.textSub, textAlign: 'center', marginBottom: spacing.xl },
  label:          { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  input:          {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
    borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: 16, marginBottom: spacing.lg,
  },
  codeInput:      { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: 12 },
  themeRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  themePill:      {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.round,
    paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.card,
  },
  themePillActive: { borderColor: colors.primary, backgroundColor: '#F5C51822' },
  themeEmoji:     { fontSize: 14 },
  themeLabel:     { fontSize: 12, color: colors.textMuted },
  themeLabelActive: { color: colors.primary },
  dauberRow:      { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  dauberDot:      { width: 36, height: 36, borderRadius: 18 },
  dauberActive:   { borderWidth: 3, borderColor: colors.white },
  btn:            { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  btnSecondary:   { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary },
  btnDisabled:    { opacity: 0.4 },
  btnText:        { color: colors.black, fontSize: 17, fontWeight: '800' },
  demoNote:       { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: spacing.md },
});
