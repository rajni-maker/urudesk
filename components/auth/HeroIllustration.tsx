/* Hand-built vector portrait of a PixelSupport support rep at a modern
 * workstation. Every animated part (eyelids, torso, head, hands) is its own
 * group so CSS can drive it — see signup.css for the keyframes.
 *
 * Purely decorative: aria-hidden, and every loop stops under
 * prefers-reduced-motion.
 */
export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 460 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="ps-skin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E3AC7C" />
          <stop offset="100%" stopColor="#B87B4B" />
        </linearGradient>
        <linearGradient id="ps-hair" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#2C211C" />
          <stop offset="100%" stopColor="#0D0907" />
        </linearGradient>
        {/* Kurta: dusty rose with a deeper rose in the folds */}
        <linearGradient id="ps-kurta" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EFBCC8" />
          <stop offset="100%" stopColor="#C9899F" />
        </linearGradient>
        <linearGradient id="ps-screen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B2036" />
          <stop offset="100%" stopColor="#0C1020" />
        </linearGradient>
        <linearGradient id="ps-ai" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="ps-desk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
        </linearGradient>
        <linearGradient id="ps-leaf" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0E7C63" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <linearGradient id="ps-rgb" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#4F46E5" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.55" />
        </linearGradient>
        <filter id="ps-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>
        <filter id="ps-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* ---------- Ambient RGB wash on the back wall ---------- */}
      <ellipse cx="230" cy="180" rx="180" ry="120" fill="url(#ps-rgb)" opacity="0.16" filter="url(#ps-blur)" />

      {/* Soft light rays raking down from the upper left */}
      <g opacity="0.13">
        <path d="M40 0 L110 0 L190 300 L140 300 Z" fill="url(#ps-ai)" filter="url(#ps-blur)" />
        <path d="M150 0 L185 0 L230 260 L205 260 Z" fill="url(#ps-ai)" filter="url(#ps-blur)" />
      </g>

      {/* ---------- Indoor plant ---------- */}
      <g className="ps-sway" style={{ transformOrigin: "62px 330px" }}>
        <path d="M62 300 Q46 268 30 250" stroke="url(#ps-leaf)" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 300 Q78 262 96 246" stroke="url(#ps-leaf)" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 300 Q60 258 62 232" stroke="url(#ps-leaf)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="28" cy="246" rx="15" ry="9" fill="url(#ps-leaf)" opacity="0.85" transform="rotate(-38 28 246)" />
        <ellipse cx="98" cy="242" rx="15" ry="9" fill="url(#ps-leaf)" opacity="0.85" transform="rotate(35 98 242)" />
        <ellipse cx="62" cy="226" rx="12" ry="17" fill="url(#ps-leaf)" opacity="0.9" />
        <ellipse cx="44" cy="268" rx="13" ry="8" fill="url(#ps-leaf)" opacity="0.7" transform="rotate(-22 44 268)" />
        <ellipse cx="82" cy="266" rx="13" ry="8" fill="url(#ps-leaf)" opacity="0.7" transform="rotate(20 82 266)" />
      </g>
      <path d="M46 300 L78 300 L74 336 L50 336 Z" fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      <rect x="44" y="296" width="36" height="8" rx="3" fill="rgba(255,255,255,0.13)" />

      {/* ---------- Second monitor: ticket analytics ---------- */}
      <g transform="rotate(-4 372 148)">
        <rect x="308" y="88" width="128" height="98" rx="9" fill="url(#ps-screen)" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
        <rect x="315" y="95" width="114" height="84" rx="5" fill="rgba(6,182,212,0.09)" />
        <text x="323" y="110" fill="rgba(255,255,255,0.65)" fontSize="7" fontWeight="600">Ticket Analytics</text>
        {/* Bars */}
        <rect x="323" y="150" width="9" height="20" rx="2" fill="#4F46E5" opacity="0.85" />
        <rect x="337" y="140" width="9" height="30" rx="2" fill="#6366F1" opacity="0.85" />
        <rect x="351" y="128" width="9" height="42" rx="2" fill="#8B5CF6" opacity="0.85" />
        <rect x="365" y="146" width="9" height="24" rx="2" fill="#06B6D4" opacity="0.85" />
        <rect x="379" y="119" width="9" height="51" rx="2" fill="#22D3EE" opacity="0.9" />
        <rect x="393" y="134" width="9" height="36" rx="2" fill="#8B5CF6" opacity="0.8" />
        <rect x="407" y="124" width="9" height="46" rx="2" fill="#4F46E5" opacity="0.85" />
        {/* Trend line */}
        <path d="M327 146 L341 137 L355 124 L369 141 L383 115 L397 130 L411 120" stroke="#67E8F9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        <line x1="323" y1="172" x2="416" y2="172" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        {/* Live dot */}
        <circle cx="422" cy="107" r="3" fill="#10B981">
          <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>
      <rect x="360" y="186" width="16" height="24" rx="3" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <rect x="346" y="208" width="44" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
      {/* RGB underglow on the monitor stand */}
      <ellipse cx="368" cy="214" rx="42" ry="7" fill="url(#ps-rgb)" opacity="0.5" filter="url(#ps-blur)" />

      {/* ================= PERSON ================= */}

      <g className="ps-breathe" style={{ transformOrigin: "215px 330px" }}>
        {/* Torso — pink embroidered kurta, read as flat blocks of colour */}
        <path
          d="M182 214 Q166 224 158 248 Q148 282 146 330 L146 352 L286 352 L286 330 Q284 282 274 248 Q266 224 250 214 Z"
          fill="url(#ps-kurta)"
        />
        <path
          d="M182 214 Q166 224 158 248 Q148 282 146 330 L146 352 L286 352 L286 330 Q284 282 274 248 Q266 224 250 214 Z"
          fill="none"
          stroke="rgba(120,58,84,0.22)"
          strokeWidth="1"
        />
        {/* Rounded kurta neckline */}
        <path d="M196 212 Q216 246 236 212 Q232 240 216 252 Q200 240 196 212 Z" fill="#C07E96" stroke="rgba(120,58,84,0.3)" strokeWidth="1" />
        {/* Embroidered neckline band + placket motifs */}
        <path d="M194 214 Q216 250 238 214" stroke="#F6DCE4" strokeWidth="2" fill="none" opacity="0.85" />
        <path d="M198 222 Q216 250 234 222" stroke="#F6DCE4" strokeWidth="0.9" fill="none" opacity="0.55" />
        <line x1="216" y1="258" x2="216" y2="350" stroke="#F6DCE4" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.6" />
        {/* Scattered flat-vector embroidery sprigs */}
        <g fill="#F6DCE4" opacity="0.5">
          <circle cx="196" cy="286" r="1.8" />
          <circle cx="236" cy="300" r="1.8" />
          <circle cx="184" cy="330" r="1.6" />
          <circle cx="250" cy="270" r="1.6" />
          <circle cx="204" cy="322" r="1.4" />
          <circle cx="246" cy="336" r="1.4" />
        </g>
        <circle cx="216" cy="286" r="2.2" fill="#F6DCE4" opacity="0.75" />
        <circle cx="216" cy="330" r="2.2" fill="#F6DCE4" opacity="0.75" />
        {/* Shoulder seams */}
        <path d="M182 222 Q172 250 168 286" stroke="rgba(120,58,84,0.18)" strokeWidth="1.2" fill="none" />
        <path d="M250 222 Q260 250 264 286" stroke="rgba(120,58,84,0.18)" strokeWidth="1.2" fill="none" />

        {/* Neck */}
        <path d="M202 186 L230 186 L232 220 Q216 230 200 220 Z" fill="url(#ps-skin)" />
        <path d="M202 200 Q216 214 230 200" fill="rgba(0,0,0,0.12)" />

        {/* Hair — a blunt shoulder-length bob. Drawn after the torso so the
            lengths sit ON the shoulders instead of disappearing behind them.
            The notch between x196 and x236 lets the neck read through; the
            face (drawn later, in the head group) covers the bar across the
            top of that notch. */}
        <path
          d="M216 82 Q188 82 172 100 Q158 119 157 154 L157 222 Q157 233 167 233 L186 233 Q196 233 196 222 L196 170 L236 170 L236 222 Q236 233 246 233 L265 233 Q275 233 275 222 L275 154 Q274 119 260 100 Q244 82 216 82 Z"
          fill="url(#ps-hair)"
        />
        {/* Blunt ends catch a little light */}
        <path d="M161 227 L192 227" stroke="rgba(255,255,255,0.07)" strokeWidth="2" strokeLinecap="round" />
        <path d="M240 227 L271 227" stroke="rgba(255,255,255,0.07)" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ---------- Head (sways gently) ---------- */}
      <g className="ps-head" style={{ transformOrigin: "216px 200px" }}>
        {/* Ears */}
        <ellipse cx="174" cy="152" rx="6" ry="9" fill="url(#ps-skin)" />
        <ellipse cx="258" cy="152" rx="6" ry="9" fill="url(#ps-skin)" />

        {/* Earrings — small pink studs, just visible under the hair */}
        <circle cx="175" cy="159" r="3.2" fill="#E8AEBE" stroke="rgba(120,58,84,0.35)" strokeWidth="0.6" />
        <circle cx="257" cy="159" r="3.2" fill="#E8AEBE" stroke="rgba(120,58,84,0.35)" strokeWidth="0.6" />

        {/* Face — adult oval: full at the cheekbones, tapering to a soft chin.
            Occupies the same footprint the old circle did, so the headset,
            ears and neck all still line up. */}
        <path
          d="M216 101 C239 101 257 118 258 143 C258 162 250 178 234 187 Q226 192 216 192 Q206 192 198 187 C182 178 174 162 174 143 C175 118 193 101 216 101 Z"
          fill="url(#ps-skin)"
        />
        <path
          d="M216 101 C239 101 257 118 258 143 C258 162 250 178 234 187 Q226 192 216 192 Q206 192 198 187 C182 178 174 162 174 143 C175 118 193 101 216 101 Z"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        {/* Temple shading keeps the face from reading flat */}
        <path d="M180 128 Q176 150 182 170" stroke="rgba(120,64,32,0.16)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M252 128 Q256 150 250 170" stroke="rgba(120,64,32,0.16)" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Hair, front — a deep side part: the weight sits on the wearer's
            right and sweeps across the brow, which reads more grown-up than a
            symmetrical centre part. */}
        <path
          d="M173 154 Q167 108 196 90 Q220 76 243 88 Q263 100 262 154 Q257 130 248 118 Q240 108 231 112 Q212 123 194 117 Q180 123 176 139 Q174 147 173 154 Z"
          fill="url(#ps-hair)"
        />
        {/* Sheen following the sweep, plus the part line itself */}
        <path d="M236 86 Q226 92 222 104" stroke="rgba(255,255,255,0.10)" strokeWidth="1.1" fill="none" />
        <path d="M230 100 Q210 112 190 110" stroke="rgba(255,255,255,0.07)" strokeWidth="1" fill="none" />
        <path d="M244 100 Q252 116 254 136" stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />
        {/* No face-framing strands here — the bob silhouette behind the head
            supplies the sides, and strands over it would break the blunt edge. */}

        {/* Brows — set closer to the eye, straighter and lower than a young
            face would carry them */}
        <path d="M190 136 Q200 131 211 135" stroke="#2A1C14" strokeWidth="2.7" strokeLinecap="round" fill="none" />
        <path d="M221 135 Q232 131 242 136" stroke="#2A1C14" strokeWidth="2.7" strokeLinecap="round" fill="none" />

        {/* Eyes — narrower than before; wide round eyes read childlike.
            The group scales flat to blink. */}
        <g className="ps-blink" style={{ transformOrigin: "216px 146px" }}>
          <ellipse cx="201" cy="146" rx="5.8" ry="3" fill="#fff" opacity="0.9" />
          <ellipse cx="231" cy="146" rx="5.8" ry="3" fill="#fff" opacity="0.9" />
          <circle cx="201" cy="146" r="2.5" fill="#3D2A1C" />
          <circle cx="231" cy="146" r="2.5" fill="#3D2A1C" />
          <circle cx="201" cy="146" r="1.2" fill="#150D08" />
          <circle cx="231" cy="146" r="1.2" fill="#150D08" />
          <circle cx="202" cy="144.9" r="0.9" fill="#fff" />
          <circle cx="232" cy="144.9" r="0.9" fill="#fff" />
          {/* Upper lash line, and a light lower lid crease */}
          <path d="M195 144.4 Q201 141.4 207 144.4" stroke="#2A1C14" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M225 144.4 Q231 141.4 237 144.4" stroke="#2A1C14" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Lower lids pushed up by the smile, plus the faintest crow's feet —
              this is what makes the smile read as felt rather than posed */}
          <path d="M196 149.6 Q201 148 206 149.6" stroke="rgba(120,64,32,0.34)" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <path d="M226 149.6 Q231 148 236 149.6" stroke="rgba(120,64,32,0.34)" strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <path d="M191 143 L188 141" stroke="rgba(120,64,32,0.2)" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M191 147 L188 148" stroke="rgba(120,64,32,0.2)" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M241 143 L244 141" stroke="rgba(120,64,32,0.2)" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M241 147 L244 148" stroke="rgba(120,64,32,0.2)" strokeWidth="0.8" strokeLinecap="round" />
        </g>

        {/* Nose — longer bridge reads adult rather than child */}
        <path d="M216 147 Q212 159 217 163" stroke="rgba(90,50,30,0.38)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M210 164 Q216 167 222 164" stroke="rgba(90,50,30,0.26)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Nose stud */}
        <circle cx="209.5" cy="162" r="0.9" fill="#F3E3C8" opacity="0.9" />

        {/* Smile — genuinely warm: corners lifted, a glimpse of teeth. Still
            narrow enough to stay professional rather than a broad grin. */}
        <path d="M204 172 Q216 184 228 172 Q216 176 204 172 Z" fill="#A85B6E" />
        <path d="M206 173 Q216 178.5 226 173 Q216 175 206 173 Z" fill="#FFFFFF" opacity="0.92" />
        <path d="M204 172 Q216 169 228 172" stroke="#8E5061" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Corners turning up — the difference between polite and pleased */}
        <path d="M203 172 Q204.5 169.5 207 169.5" stroke="#8E5061" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <path d="M229 172 Q227.5 169.5 225 169.5" stroke="#8E5061" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        {/* Nasolabial hint — barely there; enough to age the face without
            turning into hard parentheses around the mouth */}
        <path d="M202 160 Q199 167 203 173" stroke="rgba(120,64,32,0.13)" strokeWidth="1" strokeLinecap="round" fill="none" />
        <path d="M230 160 Q233 167 229 173" stroke="rgba(120,64,32,0.13)" strokeWidth="1" strokeLinecap="round" fill="none" />
        {/* Cheeks lifted and warmed by the smile */}
        <ellipse cx="191" cy="155" rx="9" ry="5.5" fill="#C2705C" opacity="0.16" />
        <ellipse cx="241" cy="155" rx="9" ry="5.5" fill="#C2705C" opacity="0.16" />

        {/* ---------- Premium wireless headset ---------- */}
        <path d="M170 150 Q164 92 216 86 Q268 92 262 150" stroke="#2A2F3E" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <path d="M170 150 Q164 92 216 86 Q268 92 262 150" stroke="url(#ps-ai)" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.75" />
        <rect x="160" y="136" width="17" height="30" rx="8" fill="#1A1F2C" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <rect x="255" y="136" width="17" height="30" rx="8" fill="#1A1F2C" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <rect x="163" y="142" width="11" height="18" rx="5" fill="#3B4256" />
        <rect x="258" y="142" width="11" height="18" rx="5" fill="#3B4256" />
        {/* RGB accent rings on the earcups */}
        <rect x="160" y="136" width="17" height="30" rx="8" fill="none" stroke="url(#ps-ai)" strokeWidth="1.4" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.35;0.85" dur="3s" repeatCount="indefinite" />
        </rect>
        <rect x="255" y="136" width="17" height="30" rx="8" fill="none" stroke="url(#ps-ai)" strokeWidth="1.4" opacity="0.85">
          <animate attributeName="opacity" values="0.35;0.85;0.35" dur="3s" repeatCount="indefinite" />
        </rect>
        {/* Mic boom */}
        <path d="M264 164 Q276 184 250 190" stroke="#2A2F3E" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <circle cx="249" cy="190" r="3.6" fill="#3B4256" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <circle cx="249" cy="190" r="6" fill="none" stroke="url(#ps-ai)" strokeWidth="0.8" opacity="0.5">
          <animate attributeName="r" values="6;9;6" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ---------- Arms reaching to the laptop ---------- */}
      <path d="M166 268 Q142 300 150 330" stroke="url(#ps-kurta)" strokeWidth="21" strokeLinecap="round" fill="none" />
      <path d="M266 268 Q290 300 282 330" stroke="url(#ps-kurta)" strokeWidth="21" strokeLinecap="round" fill="none" />
      {/* Embroidered cuff bands */}
      <path d="M143 322 Q150 327 158 322" stroke="#F6DCE4" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M274 322 Q282 327 289 322" stroke="#F6DCE4" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Hands — small independent typing motion */}
      <g className="ps-hand-l">
        <ellipse cx="150" cy="333" rx="13" ry="8.5" fill="url(#ps-skin)" transform="rotate(-18 150 333)" />
        <path d="M143 336 L157 336" stroke="rgba(120,70,45,0.3)" strokeWidth="1" strokeLinecap="round" />
      </g>
      <g className="ps-hand-r">
        <ellipse cx="282" cy="333" rx="13" ry="8.5" fill="url(#ps-skin)" transform="rotate(18 282 333)" />
        <path d="M275 336 L289 336" stroke="rgba(120,70,45,0.3)" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* ---------- Desk ---------- */}
      <rect x="20" y="336" width="420" height="7" rx="3.5" fill="url(#ps-desk)" />
      <ellipse cx="230" cy="352" rx="190" ry="12" fill="rgba(255,255,255,0.03)" />
      {/* RGB strip glowing under the desk edge */}
      <rect x="40" y="345" width="380" height="3" rx="1.5" fill="url(#ps-rgb)" opacity="0.75" filter="url(#ps-blur)" />

      {/* ---------- Laptop: the PixelSupport dashboard ---------- */}
      <g>
        <rect x="146" y="256" width="168" height="106" rx="8" fill="url(#ps-screen)" stroke="rgba(255,255,255,0.16)" strokeWidth="1.6" />
        <rect x="153" y="263" width="154" height="92" rx="5" fill="rgba(79,70,229,0.10)" />

        {/* App chrome */}
        <rect x="153" y="263" width="154" height="14" rx="5" fill="rgba(255,255,255,0.07)" />
        <circle cx="161" cy="270" r="2" fill="#F43F5E" opacity="0.8" />
        <circle cx="168" cy="270" r="2" fill="#F59E0B" opacity="0.8" />
        <circle cx="175" cy="270" r="2" fill="#10B981" opacity="0.8" />
        <text x="184" y="273" fill="rgba(255,255,255,0.75)" fontSize="7" fontWeight="700">Support Dashboard</text>

        {/* Widget: Latest reply */}
        <rect x="158" y="282" width="70" height="30" rx="4" fill="rgba(139,92,246,0.18)" stroke="rgba(139,92,246,0.4)" strokeWidth="0.8" />
        <path d="M165 289 a3 3 0 0 0 4.5 4.5 4.5 4.5 0 1 1-4.5-4.5Z" fill="none" stroke="#C4B5FD" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        <text x="174" y="293" fill="#DDD6FE" fontSize="6" fontWeight="600">Latest Reply</text>
        <line x1="164" y1="300" x2="221" y2="300" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="164" y1="305" x2="207" y2="305" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" strokeLinecap="round">
          <animate attributeName="x2" values="164;207;207" dur="4s" repeatCount="indefinite" />
        </line>

        {/* Widget: Open Tickets */}
        <rect x="233" y="282" width="69" height="30" rx="4" fill="rgba(6,182,212,0.16)" stroke="rgba(6,182,212,0.38)" strokeWidth="0.8" />
        <text x="239" y="292" fill="#A5F3FC" fontSize="6" fontWeight="600">Open Tickets</text>
        <text x="239" y="306" fill="#FFFFFF" fontSize="12" fontWeight="700">24</text>
        <circle cx="292" cy="300" r="5.5" fill="none" stroke="#22D3EE" strokeWidth="1.6" opacity="0.8" />
        <path d="M292 295 a5.5 5.5 0 0 1 5 3.4" stroke="#67E8F9" strokeWidth="1.8" strokeLinecap="round" fill="none" />

        {/* Widget: Ticket Analytics */}
        <rect x="158" y="316" width="144" height="34" rx="4" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        <text x="164" y="325" fill="rgba(255,255,255,0.6)" fontSize="6" fontWeight="600">Ticket Analytics</text>
        <rect x="164" y="336" width="7" height="9" rx="1.5" fill="#4F46E5" />
        <rect x="175" y="331" width="7" height="14" rx="1.5" fill="#6366F1" />
        <rect x="186" y="334" width="7" height="11" rx="1.5" fill="#8B5CF6" />
        <rect x="197" y="328" width="7" height="17" rx="1.5" fill="#A78BFA" />
        <rect x="208" y="333" width="7" height="12" rx="1.5" fill="#06B6D4" />
        <rect x="219" y="330" width="7" height="15" rx="1.5" fill="#22D3EE" />
        <path d="M238 342 L248 334 L258 337 L268 327 L280 331 L294 322" stroke="#67E8F9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
        <circle cx="294" cy="322" r="2" fill="#67E8F9">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Screen sheen */}
        <path d="M153 263 L200 263 L153 340 Z" fill="rgba(255,255,255,0.04)" />

        {/* Base + hinge */}
        <path d="M132 362 L328 362 L336 372 Q336 376 331 376 L129 376 Q124 376 124 372 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        <rect x="200" y="366" width="60" height="3" rx="1.5" fill="rgba(255,255,255,0.16)" />
        {/* Keyboard glow */}
        <rect x="140" y="364" width="180" height="4" rx="2" fill="url(#ps-rgb)" opacity="0.6" filter="url(#ps-blur)" />
      </g>

      {/* ---------- Coffee mug ---------- */}
      <g>
        <path d="M336 312 L360 312 L357 336 Q356 340 351 340 L345 340 Q340 340 339 336 Z" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
        <path d="M360 318 Q370 320 368 328 Q366 334 357 333" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" fill="none" />
        <ellipse cx="348" cy="312" rx="12" ry="3.4" fill="#6B4A32" opacity="0.85" />
        {/* Steam */}
        <path className="ps-steam" d="M343 306 q4 -6 0 -12 q-4 -6 0 -11" stroke="rgba(255,255,255,0.32)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path className="ps-steam ps-steam-2" d="M352 306 q4 -6 0 -12 q-4 -6 0 -11" stroke="rgba(255,255,255,0.22)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </g>

      {/* ---------- Floating AI interface ---------- */}
      <g>
        {/* Orb */}
        <circle cx="318" cy="212" r="19" fill="url(#ps-ai)" filter="url(#ps-glow)" opacity="0.92">
          <animate attributeName="r" values="19;22;19" dur="3.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="318" cy="212" r="13" fill="#fff" opacity="0.12" />
        <path d="M313 208 a4 4 0 0 0 6 6 6 6 0 1 1-6-6Z" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <circle cx="318" cy="212" r="26" fill="none" stroke="url(#ps-ai)" strokeWidth="1" opacity="0.4">
          <animate attributeName="r" values="26;36;26" dur="3.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="3.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="318" cy="212" r="34" fill="none" stroke="url(#ps-ai)" strokeWidth="0.6" opacity="0.22">
          <animate attributeName="r" values="34;46;34" dur="3.4s" begin="1.1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.22;0;0.22" dur="3.4s" begin="1.1s" repeatCount="indefinite" />
        </circle>

        {/* Data thread from the orb to the rep */}
        <path d="M300 206 Q282 192 268 184" stroke="url(#ps-ai)" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.6" fill="none">
          <animate attributeName="stroke-dashoffset" values="0;16" dur="1.1s" repeatCount="indefinite" />
        </path>

        {/* The "AI Draft Reply" glass panel that used to sit here was removed:
            the overlaid capability chip in AuthHero carries the same label and
            landed directly on top of it. */}

        {/* Glass panel: resolution time */}
        <g className="ps-panel ps-panel-2">
          <rect x="24" y="176" width="86" height="30" rx="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
          <circle cx="38" cy="191" r="6" fill="none" stroke="#67E8F9" strokeWidth="1.3" />
          <path d="M38 187.5 L38 191 L40.5 192.5" stroke="#67E8F9" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <text x="50" y="189" fill="rgba(255,255,255,0.8)" fontSize="6.5" fontWeight="600">Avg resolve</text>
          <text x="50" y="199" fill="#67E8F9" fontSize="8" fontWeight="700">2.4h</text>
        </g>

        {/* Sparkles */}
        <g fill="#fff">
          <path className="ps-twinkle" d="M292 152 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" opacity="0.7" />
          <path className="ps-twinkle ps-twinkle-2" d="M126 214 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" opacity="0.6" />
          <path className="ps-twinkle ps-twinkle-3" d="M404 68 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" opacity="0.55" />
          <path className="ps-twinkle ps-twinkle-4" d="M146 92 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" opacity="0.5" />
        </g>
      </g>
    </svg>
  );
}
