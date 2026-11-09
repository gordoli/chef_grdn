'use client';

import { useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, BookOpen, Scissors, Thermometer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  cookingTemperature,
  cookingUnits,
  convertCookingMeasure,
  safeTemperatures,
  steakDoneness,
  type CookingUnit,
  type MeasureKind,
  type TemperatureUnit,
} from '@/lib/kitchenBasics';

const sources = {
  safety: 'https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures',
  poultry: 'https://www.foodsafety.gov/food-safety-charts/meat-poultry-charts',
  prep: 'https://www.foodsafety.gov/keep-food-safe/4-steps-to-food-safety',
  steak: 'https://www.thermoworks.com/blogs/thermoblog/how-to-temp-a-steak',
  flipping: 'https://www.seriouseats.com/old-wives-tales-about-cooking-steak',
  spatchcock: 'https://amer.weber.com/en-us/blogs/recipes/the-ultimate-spatchcocked-chicken',
  measures:
    'https://www.nist.gov/pml/owm/metric-si/unit-conversion/approximate-conversions-us-customary-measures-metric',
};
const topics = [
  { id: 'temps', label: 'Temps' },
  { id: 'steak', label: 'Steak' },
  { id: 'skills', label: 'Skills' },
  { id: 'conversions', label: 'Conversions' },
] as const;
type Topic = (typeof topics)[number]['id'];
function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="basics-source" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={13} />
    </a>
  );
}
function TemperatureSwitch({
  unit,
  onChange,
}: {
  unit: TemperatureUnit;
  onChange: (unit: TemperatureUnit) => void;
}) {
  return (
    <div className="basics-unit-switch" aria-label="Temperature units">
      {(['F', 'C'] as const).map((value) => (
        <button key={value} onClick={() => onChange(value)} aria-pressed={unit === value}>
          °{value}
        </button>
      ))}
    </div>
  );
}
function Converter() {
  const [kind, setKind] = useState<MeasureKind>('volume');
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState<CookingUnit>('tbsp');
  const [to, setTo] = useState<CookingUnit>('tsp');
  const options = (Object.keys(cookingUnits) as CookingUnit[]).filter(
    (key) => cookingUnits[key].kind === kind,
  );
  const result = amount.trim() === '' ? null : convertCookingMeasure(Number(amount), from, to);
  const formatted =
    result === null
      ? '—'
      : new Intl.NumberFormat('en-US', { maximumSignificantDigits: 6 }).format(result);
  return (
    <article className="basics-card">
      <div className="basics-card-heading">
        <div>
          <span className="eyebrow">A LITTLE KITCHEN MATH</span>
          <h2>Make it measure up.</h2>
        </div>
        <ArrowLeftRight size={22} strokeWidth={1.4} />
      </div>
      <div className="basics-kind-switch" aria-label="Measurement type">
        {(['volume', 'weight'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value);
              setFrom(value === 'volume' ? 'tbsp' : 'oz');
              setTo(value === 'volume' ? 'tsp' : 'gram');
            }}
          >
            {value === 'volume' ? 'Volume' : 'Weight'}
          </button>
        ))}
      </div>
      <div className="basics-converter-fields">
        <label htmlFor="convert-amount">
          Amount
          <Input
            id="convert-amount"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label htmlFor="convert-from">
          From
          <select
            id="convert-from"
            value={from}
            onChange={(event) => setFrom(event.target.value as CookingUnit)}
          >
            {options.map((key) => (
              <option key={key} value={key}>
                {cookingUnits[key].short}
              </option>
            ))}
          </select>
        </label>
        <Button
          className="basics-swap"
          variant="outline"
          size="icon"
          aria-label="Swap conversion units"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <ArrowLeftRight />
        </Button>
        <label htmlFor="convert-to">
          To
          <select
            id="convert-to"
            value={to}
            onChange={(event) => setTo(event.target.value as CookingUnit)}
          >
            {options.map((key) => (
              <option key={key} value={key}>
                {cookingUnits[key].short}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="basics-converter-result" aria-live="polite" aria-atomic="true">
        <span>THAT’S</span>
        <output htmlFor="convert-amount convert-from convert-to">
          <strong>{formatted}</strong> {cookingUnits[to].short}
        </output>
      </div>
      {result === null && amount !== '' && (
        <p role="alert">Enter a finite amount of zero or more.</p>
      )}
      <p className="basics-caption">
        US customary cups and spoons. Metric results are rounded. Fluid ounces measure volume;
        ounces measure weight. Cups to grams depend on the ingredient.
      </p>
      <Source href={sources.measures}>NIST measurement reference</Source>
    </article>
  );
}
export function Basics() {
  const [topic, setTopic] = useState<Topic>('temps');
  const [unit, setUnit] = useState<TemperatureUnit>('F');
  const temp = (value: number) => cookingTemperature(value, unit);
  return (
    <div className="basics-page page-width">
      <header className="basics-heading">
        <div>
          <h1>Kitchen basics</h1>
          <p>The little things that make you a better cook.</p>
        </div>
        <BookOpen size={26} strokeWidth={1.3} aria-hidden="true" />
      </header>
      <nav className="basics-topics" aria-label="Basics topics">
        {topics.map((item) => (
          <button key={item.id} aria-pressed={topic === item.id} onClick={() => setTopic(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      {topic === 'temps' && (
        <section className="basics-layout" aria-label="Safe cooking temperatures">
          <article className="basics-card">
            <div className="basics-card-heading">
              <div>
                <span className="eyebrow">THE SAFE MINIMUMS</span>
                <h2>Cook with confidence.</h2>
              </div>
              <TemperatureSwitch unit={unit} onChange={setUnit} />
            </div>
            <div className="basics-table-wrap">
              <table className="basics-table">
                <caption className="sr-only">
                  USDA minimum internal temperatures and resting guidance
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Food</th>
                    <th scope="col">Internal temp</th>
                    <th scope="col">Remember</th>
                  </tr>
                </thead>
                <tbody>
                  {safeTemperatures.map((row) => (
                    <tr key={row.food}>
                      <th scope="row">
                        {row.food}
                        <small>{row.detail}</small>
                      </th>
                      <td className="basics-temperature">{temp(row.fahrenheit)}</td>
                      <td>{row.rest}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Source href={sources.safety}>USDA / FoodSafety.gov guidance</Source>
          </article>
          <aside className="basics-card basics-note">
            <Thermometer size={28} strokeWidth={1.3} />
            <h2>Check the center.</h2>
            <p>
              Use a food thermometer. Color, juices, and cooking time alone cannot confirm safety.
            </p>
            <p>
              For steak, check the thickest center, avoiding bone. For a whole chicken, check the
              thickest breast and innermost thigh and wing.
            </p>
            <Source href={sources.poultry}>Where to check poultry</Source>
            <Source href={sources.steak}>Finding a steak’s center</Source>
          </aside>
        </section>
      )}
      {topic === 'steak' && (
        <section className="basics-layout" aria-label="Steak doneness and flipping">
          <article className="basics-card">
            <div className="basics-card-heading">
              <div>
                <span className="eyebrow">KNOW YOUR DONENESS</span>
                <h2>A steak, your way.</h2>
              </div>
              <TemperatureSwitch unit={unit} onChange={setUnit} />
            </div>
            <p className="basics-intro">
              Approximate finished temperatures for steak. Use a thermometer; the color cues below
              are descriptive.
            </p>
            <div className="basics-table-wrap">
              <table className="basics-table">
                <caption className="sr-only">Culinary steak doneness temperatures</caption>
                <thead>
                  <tr>
                    <th scope="col">Doneness</th>
                    <th scope="col">Finished temp</th>
                    <th scope="col">Center</th>
                  </tr>
                </thead>
                <tbody>
                  {steakDoneness.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">
                        <span className="basics-doneness">
                          <i style={{ background: row.color }} aria-hidden="true" />
                          {row.name}
                        </span>
                      </th>
                      <td className="basics-temperature">{temp(row.fahrenheit)}</td>
                      <td>{row.center}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="basics-safety-note">
              USDA recommends {temp(145)} and a 3-minute rest for steaks. Lower targets carry
              greater foodborne-illness risk. Use the safe-minimum chart for ground meat and
              poultry.
            </p>
            <div className="basics-sources">
              <Source href={sources.steak}>ThermoWorks doneness reference</Source>
              <Source href={sources.safety}>USDA safety guidance</Source>
            </div>
          </article>
          <aside className="basics-card basics-note">
            <ArrowLeftRight size={28} strokeWidth={1.3} />
            <h2>When to flip.</h2>
            <ol className="basics-steps">
              <li>
                <strong>Start dry.</strong>
                <p>Pat the surface dry and preheat your pan or grill.</p>
              </li>
              <li>
                <strong>Look for a crust.</strong>
                <p>
                  Lift an edge gently. Once browned and releasing, turn with tongs; don’t tear a
                  stuck steak free.
                </p>
              </li>
              <li>
                <strong>Keep it even.</strong>
                <p>
                  Repeated flips can cook more evenly. Check the center temperature instead of
                  trusting a fixed number of minutes per side.
                </p>
              </li>
            </ol>
            <p className="basics-caption">
              Temperature can keep rising as steak rests. The rise varies with thickness and heat;
              recheck rather than assuming a fixed amount.
            </p>
            <div className="basics-sources">
              <Source href={sources.flipping}>Serious Eats: flipping & crust</Source>
              <Source href={sources.steak}>Carryover cooking</Source>
            </div>
          </aside>
        </section>
      )}
      {topic === 'skills' && (
        <section className="basics-layout" aria-label="Spatchcocking a chicken">
          <article className="basics-card">
            <div className="basics-card-heading">
              <div>
                <span className="eyebrow">ONE BIRD, FLAT OUT</span>
                <h2>Spatchcock a chicken.</h2>
              </div>
              <Scissors size={24} strokeWidth={1.4} />
            </div>
            <p className="basics-intro">
              Remove the backbone and flatten the bird for a more even cook.
            </p>
            <ol className="basics-steps basics-skill-steps">
              <li>
                <strong>Set up.</strong>
                <p>
                  Use sturdy poultry shears and a stable cutting board. Place the chicken
                  breast-side down.
                </p>
              </li>
              <li>
                <strong>Remove the backbone.</strong>
                <p>
                  Cut along each side of the backbone, from tail to neck. Lift it out; save it for
                  stock if you like.
                </p>
              </li>
              <li>
                <strong>Flatten.</strong>
                <p>
                  Open the bird, turn it breast-side up, and press firmly on the breastbone with
                  your palms until it lies flat.
                </p>
              </li>
              <li>
                <strong>Season and cook.</strong>
                <p>
                  Pat dry, tuck the wing tips, and season. Follow your roasting or grilling recipe;
                  cooking time depends on the bird and heat.
                </p>
              </li>
            </ol>
            <Source href={sources.spatchcock}>Weber’s spatchcocking method</Source>
          </article>
          <aside className="basics-card basics-note">
            <Thermometer size={28} strokeWidth={1.3} />
            <span className="basics-big-temperature">{temp(165)}</span>
            <h2>Check more than one spot.</h2>
            <p>
              Reach this minimum in the thickest breast and innermost thigh and wing, without
              touching bone.
            </p>
            <TemperatureSwitch unit={unit} onChange={setUnit} />
            <p>
              Wash hands and clean and sanitize the board, shears, and counter after raw-poultry
              prep.
            </p>
            <Source href={sources.poultry}>USDA poultry temperatures</Source>
            <Source href={sources.prep}>Safe prep & cleanup</Source>
          </aside>
        </section>
      )}
      {topic === 'conversions' && (
        <section className="basics-layout" aria-label="Cooking conversions">
          <Converter />
          <aside className="basics-card basics-note">
            <span className="eyebrow">KEEP THESE CLOSE</span>
            <h2>The everyday equivalents.</h2>
            <dl className="basics-equivalents">
              <div>
                <dt>1 tablespoon</dt>
                <dd>3 teaspoons</dd>
              </div>
              <div>
                <dt>¼ cup</dt>
                <dd>4 tablespoons</dd>
              </div>
              <div>
                <dt>1 cup</dt>
                <dd>16 tbsp · 8 fl oz</dd>
              </div>
              <div>
                <dt>1 US quart</dt>
                <dd>4 cups</dd>
              </div>
              <div>
                <dt>1 ounce</dt>
                <dd>≈ 28.35 grams</dd>
              </div>
            </dl>
            <p className="basics-caption">
              Use volume for spoons, cups, fluid ounces, and milliliters. Switch to weight for
              ounces, pounds, and grams.
            </p>
            <Source href={sources.measures}>NIST customary / metric measures</Source>
          </aside>
        </section>
      )}
    </div>
  );
}
