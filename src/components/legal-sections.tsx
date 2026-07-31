type LegalSection = { heading: string; body: string };

export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.heading} className="flex flex-col gap-1">
          <h2 className="font-semibold">{section.heading}</h2>
          {section.body.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
