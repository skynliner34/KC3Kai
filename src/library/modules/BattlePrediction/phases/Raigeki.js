(function () {
  const Raigeki = {};
  /*--------------------------------------------------------*/
  /* --------------------[ PUBLIC API ]-------------------- */
  /*--------------------------------------------------------*/
  const PLAYER_JSON_FIELDS = ['api_frai', 'api_fydam'];
  const ENEMY_JSON_FIELDS = ['api_erai', 'api_eydam'];

  Raigeki.parseRaigeki = (playerRole, battleData) => {
    const { extractFromJson, raigeki: { getTargetFactories, parseSide } }
      = KC3BattlePrediction.battle.phases;

    const targetFactories = getTargetFactories(playerRole);

    const playerAttacks = parseSide(targetFactories.playerAttack,
      extractFromJson(battleData, PLAYER_JSON_FIELDS));
    const enemyAttacks = parseSide(targetFactories.enemyAttack,
      extractFromJson(battleData, ENEMY_JSON_FIELDS));

    return playerAttacks.concat(enemyAttacks);
  };

  Raigeki.parseCombinedRaigeki = (battleData) => {
    const { extractFromJson } = KC3BattlePrediction.battle.phases;
    const { getCombinedTargetFactories, parseSide } = KC3BattlePrediction.battle.phases.raigeki;

    const targetFactories = getCombinedTargetFactories();

    const playerAttacks = parseSide(targetFactories.playerAttack,
      extractFromJson(battleData, PLAYER_JSON_FIELDS));
    const enemyAttacks = parseSide(targetFactories.enemyAttack,
      extractFromJson(battleData, ENEMY_JSON_FIELDS));

    return playerAttacks.concat(enemyAttacks);
  };

  /*--------------------------------------------------------*/
  /* --------------------[ INTERNALS ]--------------------- */
  /*--------------------------------------------------------*/

  Raigeki.parseSide = (createTargets, attacksJson) => {
    const { makeAttacks, raigeki: { removeEmptyAttacks, parseJson } }
      = KC3BattlePrediction.battle.phases;

    return makeAttacks(removeEmptyAttacks(attacksJson.map(parseJson)), createTargets);
  };

  /* --------------------[ JSON PARSE ]-------------------- */

  Raigeki.removeEmptyAttacks = attacksJson => attacksJson.filter(({ defender: { position } }) => {
    return position >= 0;
  });

  Raigeki.parseJson = (attackJson, index) => {
    const { extendError } = KC3BattlePrediction;

    if (attackJson.api_frai !== undefined && attackJson.api_fydam !== undefined) {
      return {
        attacker: { position: index },
        defender: { position: attackJson.api_frai - 1 },
        damage: attackJson.api_fydam,
      };
    }
    if (attackJson.api_erai !== undefined && attackJson.api_eydam !== undefined) {
      return {
        attacker: { position: index },
        defender: { position: attackJson.api_erai - 1 },
        damage: attackJson.api_eydam,
      };
    }
    throw extendError(new Error('Bad attack json'), { attackJson, index });
  };

  /* -----------------[ TARGET FACTORIES ]----------------- */

  Raigeki.getTargetFactories = (playerRole) => {
    const { Side, Role, bind, battle: { createTarget } } = KC3BattlePrediction;

    const playerTarget = bind(createTarget, Side.PLAYER, playerRole);
    const enemyTarget = bind(createTarget, Side.ENEMY, Role.MAIN_FLEET);

    return {
      playerAttack: ({ attacker, defender }) => ({
        attacker: playerTarget(attacker.position),
        defender: enemyTarget(defender.position),
      }),
      enemyAttack: ({ attacker, defender }) => ({
        attacker: enemyTarget(attacker.position),
        defender: playerTarget(defender.position),
      }),
    };
  };

  Raigeki.getCombinedTargetFactories = () => {
    const { Side } = KC3BattlePrediction;
    const { createCombinedTargetFactory } = KC3BattlePrediction.battle.phases.raigeki;

    const playerTarget = createCombinedTargetFactory(Side.PLAYER);
    const enemyTarget = createCombinedTargetFactory(Side.ENEMY);

    return {
      playerAttack: ({ attacker, defender }) => ({
        attacker: playerTarget(attacker.position),
        defender: enemyTarget(defender.position),
      }),
      enemyAttack: ({ attacker, defender }) => ({
        attacker: enemyTarget(attacker.position),
        defender: playerTarget(defender.position),
      }),
    };
  };

  Raigeki.createCombinedTargetFactory = (side) => {
    const { Role, battle: { createTarget } } = KC3BattlePrediction;

    return position => (position < 6
      ? createTarget(side, Role.MAIN_FLEET, position)
      : createTarget(side, Role.ESCORT_FLEET, position - 6)
    );
  };

  /*--------------------------------------------------------*/
  /* ---------------------[ EXPORTS ]---------------------- */
  /*--------------------------------------------------------*/

  Object.assign(KC3BattlePrediction.battle.phases.raigeki, Raigeki);
}());
