import React from 'react';
import AchievementTarget from './AchievementTarget.jsx';

const achievements = [
  ['hallOfFame','Hall of Fame','Enter the Hall of Fame.'],
  ['hoennPokedex','Hoenn Pokédex','Catch all 200 required Hoenn Pokémon.'],
  ['contestMaster','Contest Master','Obtain all five Lilycove Museum paintings.'],
  ['battleFrontier','Battle Frontier','Earn all seven Silver and all seven Gold Symbols.'],
];
export default function TrainerCardStars({earned}) {
  return <div className="trainer-card-stars" aria-label="Trainer Card achievements">{achievements.map(([key,name,requirement]) =>
    <AchievementTarget key={key} name={name} requirement={requirement} status={earned?.[key] === true ? 'Earned' : 'Not Earned'} className={earned?.[key] === true ? 'trainer-star-earned' : 'trainer-star-unearned'}>
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" /></svg>
    </AchievementTarget>)}</div>;
}
