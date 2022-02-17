import { run } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  WETH_ADDRESS,
  USDC_ADDRESS,
  OTOKEN_FACTORY,
  GAMMA_CONTROLLER,
  MARGIN_POOL,
  GNOSIS_EASY_AUCTION,
  DEX_ROUTER,
  DEX_FACTORY,
} from "../../constants/constants";

const main = async ({
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  console.log(`01 - Deploying Theta Vault logic on ${network.name}`);

  const chainId = network.config.chainId;

  const lifecycle = await deploy("VaultLifecycle", {
    contract: "VaultLifecycle",
    from: deployer,
  });

  const vault = await deploy("RibbonThetaVaultLogic", {
    contract: "RibbonThetaVault",
    from: deployer,
    args: [
      // WETH_ADDRESS[chainId],
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      // USDC_ADDRESS[chainId],
      "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      // OTOKEN_FACTORY[chainId],
      "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
      // GAMMA_CONTROLLER[chainId],
      "0x59b670e9fA9D0A427751Af201D676719a970857b",
      // MARGIN_POOL[chainId],
      "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1"
      GNOSIS_EASY_AUCTION[chainId],
      DEX_ROUTER[chainId],
      DEX_FACTORY[chainId],
    ],
    libraries: {
      VaultLifecycle: lifecycle.address,
    },
  });
  console.log(`RibbonThetaVaultLogic @ ${vault.address}`);

  try {
    await run("verify:verify", {
      address: vault.address,
      constructorArguments: [
        WETH_ADDRESS[chainId],
        USDC_ADDRESS[chainId],
        OTOKEN_FACTORY[chainId],
        GAMMA_CONTROLLER[chainId],
        MARGIN_POOL[chainId],
        GNOSIS_EASY_AUCTION[chainId],
        DEX_ROUTER[chainId],
        DEX_FACTORY[chainId],
      ],
    });
  } catch (error) {
    console.log(error);
  }
};
main.tags = ["RibbonThetaVaultLogic"];

export default main;
