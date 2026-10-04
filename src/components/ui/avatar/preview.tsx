'use client';

import { Plane, Specimen, State } from '@/system/specimen';
import { Avatar, AvatarGroup } from '.';

const PEOPLE = ['Maya Chen', 'Jonas Weber', 'Amara Okafor', 'Lucas Moreau', 'Priya Natarajan', 'Tomás Rivera', 'Hana Sato'];

export default function AvatarPreview() {
  return (
    <>
      <Specimen label="Sizes" note="24, 32 and 40px.">
        <State label="sm"><Avatar name="Maya Chen" size="sm" /></State>
        <State label="md"><Avatar name="Maya Chen" /></State>
        <State label="lg"><Avatar name="Maya Chen" size="lg" /></State>
      </Specimen>
      <Specimen label="Derived colour" note="One chart hue per name, the same every time; initials stay readable in both themes.">
        {PEOPLE.map((n) => <Avatar key={n} name={n} size="lg" />)}
      </Specimen>
      <Specimen label="Group" note="Tucked under each other by a sliver, then +N. Each avatar is ringed in surface, so on a card the overlap cuts cleanly between faces.">
        <Plane on="surface" className="flex flex-wrap items-start gap-10">
          <State label="Three"><AvatarGroup names={PEOPLE.slice(0, 3)} /></State>
          <State label="Seven, max 4"><AvatarGroup names={PEOPLE} size="md" /></State>
        </Plane>
      </Specimen>
      <Specimen label="With a name">
        <span className="flex items-center gap-2.5">
          <Avatar name="Amara Okafor" />
          <span><span className="block text-sm font-medium leading-tight">Amara Okafor</span><span className="block text-xs text-ink-3">Admin</span></span>
        </span>
      </Specimen>
    </>
  );
}
