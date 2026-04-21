interface BoatFormatInput {
  sail_number: string;
  class_name?: string | null;
  owner?: string | null;
}

/** Canonical boat display string: "Laser 1234 — Smith" or "1234 — Smith" or "Laser 1234" or "1234" */
export function formatBoat({ sail_number, class_name, owner }: BoatFormatInput): string {
  const id = class_name ? `${class_name} ${sail_number}` : sail_number;
  return owner ? `${id} — ${owner}` : id;
}
