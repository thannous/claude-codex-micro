export function sourceProfile() {
  return {
    keyboard: "codex_micro",
    language: "us",
    profile: {
      id: 0,
      name: "Default",
      layers: [
        {
          id: 0,
          name: "Layer 1",
          layout: {
            encoders: [[
              { keycode: "KV_OAI_ENC_CC" },
              { keycode: "KV_OAI_ENC_CW" },
              { keycode: "KV_OAI_ENC_CLK" },
            ]],
            joystick: { type: "VENDOR", sectors: [] },
            base: [[{ keycode: "KV_0" }]],
          },
        },
        {
          id: 1,
          name: "Claude",
          linkedAppId: 7,
          layout: {
            encoders: [[
              { keycode: "KC_NONE" },
              { keycode: "KC_NONE" },
              { keycode: "KC_NONE" },
            ]],
            joystick: {
              type: "RADIAL",
              sectors: [
                { k: "KI_X", a1: 0.1875, a2: 0.3125 },
                { k: "KC_NONE", a1: 0.3125, a2: 0.1875 },
              ],
            },
            base: [
              [{ keycode: "KC_NONE" }, { keycode: "KC_NONE" }],
              [
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
              ],
              [
                { keycode: "KA_0" },
                { keycode: "KA_1" },
                { keycode: "KA_2" },
                { keycode: "KC_ESC" },
              ],
              [
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
              ],
            ],
          },
        },
      ],
    },
    actions: [
      {
        id: 0,
        name: "Claude New",
        color: null,
        keyInputs: [
          { keycode: "KC_LGUI", delay: 0, actionType: 1 },
          { keycode: "KC_N", delay: 0, actionType: 2 },
          { keycode: "KC_LGUI", delay: 0, actionType: 0 },
        ],
      },
    ],
    multiactions: [],
    smartActions: [],
    actionGroups: [{ id: 0, name: "Default", actionIds: [0] }],
    multiactionGroups: [],
    smartActionGroups: [],
  };
}
