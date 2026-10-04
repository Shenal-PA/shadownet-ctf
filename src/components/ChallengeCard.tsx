import React from 'react';
import styles from '@/styles/Challenges.module.css';

interface Challenge {
  id: number;
  name: string;
  domain: string;
  difficulty: string;
  points: number;
  solved?: boolean;
}

export default function ChallengeCard({ challenge, solved }: { challenge: Challenge; solved?: boolean }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>{challenge.name}</h3>
        {solved && <span className={styles.solved}>✅</span>}
      </div>
      
      <div className={styles.meta}>
        <span>{challenge.domain}</span>
        <span>{challenge.difficulty}</span>
        <span className={styles.points}>{challenge.points} pts</span>
      </div>
      
      <a href={`/dashboard/challenges/${challenge.id}`} className={styles.button}>
        View Challenge
      </a>
    </div>
  );
}
