'use client';

import { ConversationPanel } from './agent-ui/conversation-panel';
import type { VoiceState } from './status';
import { getScenarioPresentation } from '@/lib/presentation';

type TranscriptMessage = {
  turn_id?: string | number;
  uid: number;
  text?: string;
  createdAt?: number;
};
type Props = {
  messageList: TranscriptMessage[];
  currentInProgressMessage: TranscriptMessage | null;
  agentUID: string;
  state?: VoiceState;
};

export function QuickstartTranscriptPanel({
  messageList,
  currentInProgressMessage,
  agentUID,
  state = 'ready',
}: Props) {
  const messages = currentInProgressMessage
    ? [...messageList, currentInProgressMessage]
    : messageList;
  const scenario = getScenarioPresentation();
  return (
    <ConversationPanel
      id="it-transcript"
      name={scenario.name}
      speakerLabels={{ agent: scenario.speakers.agent, user: scenario.speakers.learner }}
      pending={!!currentInProgressMessage}
      voiceState={state}
      className="demo-conversation"
      messages={messages.map((message) => ({
        id: `${message.uid}-${message.turn_id ?? message.createdAt ?? 'current'}`,
        role: String(message.uid) === agentUID ? 'agent' : 'user',
        text: message.text?.trim() || '…',
        createdAt: message.createdAt,
        streaming: message === currentInProgressMessage,
      }))}
    />
  );
}
