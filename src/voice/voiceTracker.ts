import { GuildMember, VoiceState } from 'discord.js';

const voiceMembers = new Set<string>();

export function trackVoiceJoin(state: VoiceState): void {
  if (state.member && state.channelId) {
    voiceMembers.add(makeKey(state.member));
  }
}

export function trackVoiceLeave(state: VoiceState): void {
  if (state.member) {
    voiceMembers.delete(makeKey(state.member));
  }
}

export function isInVoice(member: GuildMember): boolean {
  return voiceMembers.has(makeKey(member)) || member.voice.channelId !== null;
}

export function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): void {
  if (!oldState.channelId && newState.channelId) {
    trackVoiceJoin(newState);
  } else if (oldState.channelId && !newState.channelId) {
    trackVoiceLeave(oldState);
  }
}

function makeKey(member: GuildMember): string {
  return `${member.guild.id}:${member.id}`;
}
