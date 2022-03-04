import { ethers, run } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  WETH_ADDRESS,
  USDC_ADDRESS,
  OTOKEN_FACTORY,
  GAMMA_CONTROLLER,
  MARGIN_POOL,
  GNOSIS_EASY_AUCTION,
  OptionsPremiumPricerInStables_BYTECODE,
  TestVolOracle_BYTECODE,
  DEX_ROUTER,
  DEX_FACTORY,
  GAMMA_WHITELIST,
} from "../../constants/constants";
import {
  AUCTION_DURATION,
  AVAX_STRIKE_STEP,
  ETH_STRIKE_STEP,
  MANAGEMENT_FEE,
  PERFORMANCE_FEE,
  PREMIUM_DISCOUNT,
  STRIKE_DELTA,
} from "../utils/constants";
import OptionsPremiumPricerInStables_ABI from "../../constants/abis/OptionsPremiumPricerInStables.json";
import TestVolOracle_ABI from "../../constants/abis/TestVolOracle.json";

const main = async ({
  network,
  deployments,
  getNamedAccounts,
}: HardhatRuntimeEnvironment) => {
  // == Vault and dependencies deployments ==
  const { deploy } = deployments;
  const { deployer, owner, keeper, admin, feeRecipient } =
    await getNamedAccounts();
  // const [
  //   adminSigner,
  //   ownerSigner,
  //   keeperSigner,
  //   userSigner,
  //   feeRecipientSigner,
  // ] = await ethers.getSigners();
  const [signer, signer2] = await ethers.getSigners();
  console.log(`01 - Deploying Theta Vault logic on ${network.name}`);

  const chainId = network.config.chainId;
  console.log(chainId);

  // deploy VaultLifecycle library
  const lifecycle = await deploy("VaultLifecycle", {
    contract: "VaultLifecycle",
    from: deployer,
  });

  console.log(`VaultLifecycle @ ${lifecycle.address}`);

  // deploy RibbonThetaVault
  const vault = await deploy("RibbonThetaVaultLogic", {
    contract: "RibbonThetaVaultNoDep",
    from: deployer,
    args: [
      WETH_ADDRESS[chainId],
      USDC_ADDRESS[chainId],
      OTOKEN_FACTORY[chainId],
      GAMMA_CONTROLLER[chainId],
      MARGIN_POOL[chainId],
      GNOSIS_EASY_AUCTION[chainId],
    ],
    libraries: {
      VaultLifecycle: lifecycle.address,
    },
  });
  console.log(`RibbonThetaVaultLogic @ ${vault.address}`);
  const vaultDeployment = (
    await ethers.getContractFactory("RibbonThetaVaultNoDep", {
      libraries: { VaultLifecycle: lifecycle.address },
    })
  ).attach(vault.address);

  //vault parameters

  // const owner = ownerSigner.address;
  // const keeper = keeperSigner.address;
  // const user = userSigner.address;
  // const feeRecipient = feeRecipientSigner.address;
  // const managementFee = ethers.BigNumber.from("2000000");
  // const performanceFee = ethers.BigNumber.from("20000000");
  const tokenName = `Ribbon Theta Vault (Call)`;
  const tokenSymbol = `rETH-THETA`;
  // const premiumDiscount = ethers.BigNumber.from("997");
  // const auctionDuration = 21600;
  // const isUsdcAuction = false;
  // const isPut = false;

  //deploy MockPriceOracle
  const MockPriceOracle = await ethers.getContractFactory(
    "MockPriceOracle",
    signer
  );

  const mockPriceOracle = await MockPriceOracle.deploy();

  // Deploy mock volatility oracle
  const MockVolatilityOracle = await ethers.getContractFactory(
    "MockVolatilityOracle",
    signer
  );

  const mockVolatilityOracle = await MockVolatilityOracle.deploy();

  console.log(`MockVolatilityOracle @ ${mockVolatilityOracle.address}`);

  // Deploy MockOptionsPremiumPricer
  const MockOptionsPremiumPricer = await ethers.getContractFactory(
    "MockOptionsPremiumPricer",
    signer
  );

  const mockOptionsPremiumPricer = await MockOptionsPremiumPricer.deploy();

  console.log(`MockOptionsPremiumPricer @ ${mockOptionsPremiumPricer.address}`);

  //Deploy MockStrikeSelection
  const MockStrikeSelection = await ethers.getContractFactory(
    "PercentStrikeSelection",
    signer
  );

  //set mock parameters
  await mockOptionsPremiumPricer.setPriceOracle(mockPriceOracle.address);
  await mockOptionsPremiumPricer.setVolatilityOracle(
    mockVolatilityOracle.address
  );

  await mockOptionsPremiumPricer.setPool(mockPriceOracle.address);
  await mockOptionsPremiumPricer.setPremium(ethers.utils.parseEther("100"));
  await mockPriceOracle.setDecimals(8);
  // await mockVolatilityOracle.setAnnualizedVol(1);

  await mockOptionsPremiumPricer.setOptionUnderlyingPrice(
    ethers.BigNumber.from(2500).mul(
      ethers.BigNumber.from(10).pow(await mockPriceOracle.decimals())
    )
  );

  let multiplier = 150;
  let mockStrikeSelection = await MockStrikeSelection.deploy(
    mockOptionsPremiumPricer.address,
    ethers.BigNumber.from(100).mul(10 ** (await mockPriceOracle.decimals())),
    multiplier
  );

  console.log(`MockStrikeSelection @ ${mockStrikeSelection.address}`);

  //initialize ThetaVault
  const initArgs = [
    {
      _owner: owner,
      _keeper: keeper,
      _feeRecipient: feeRecipient,
      _managementFee: MANAGEMENT_FEE,
      _performanceFee: PERFORMANCE_FEE,
      _tokenName: tokenName,
      _tokenSymbol: tokenSymbol,
      _optionsPremiumPricer: mockOptionsPremiumPricer.address,
      _strikeSelection: mockStrikeSelection.address,
      _premiumDiscount: PREMIUM_DISCOUNT,
      _auctionDuration: AUCTION_DURATION,
      _isUsdcAuction: false,
    },
    {
      isPut: false,
      decimals: 18,
      asset: WETH_ADDRESS[chainId],
      underlying: WETH_ADDRESS[chainId],
      minimumSupply: ethers.BigNumber.from(10).pow(10),
      cap: ethers.utils.parseEther("1000"),
    },
  ];

  await vaultDeployment.initialize(
    [
      owner,
      keeper,
      feeRecipient,
      MANAGEMENT_FEE,
      PERFORMANCE_FEE,
      tokenName,
      tokenSymbol,
      mockOptionsPremiumPricer.address,
      mockStrikeSelection.address,
      PREMIUM_DISCOUNT,
      AUCTION_DURATION,
      false,
    ],
    [
      false,
      18,
      WETH_ADDRESS[chainId],
      WETH_ADDRESS[chainId],
      ethers.BigNumber.from("10").pow("10").toString(),
      ethers.utils.parseEther("1000"),
    ]
  );

  // deploy proxy
  const RibbonThetaVault = await ethers.getContractFactory("RibbonThetaVault", {
    libraries: {
      VaultLifecycle: lifecycle.address,
    },
  });
  // const initData = RibbonThetaVault.interface.encodeFunctionData(
  //   "initialize",
  //   initArgs
  // );
  // const proxy = await deploy("RibbonThetaVaultTest", {
  //   contract: "AdminUpgradeabilityProxy",
  //   from: deployer,
  //   args: [vault.address, admin, initData],
  // });
  // console.log(`RibbonThetaVaultTest Proxy @ ${proxy.address}`);

  // ==Vault Lifecycle flow==
  // 1. Change admin on vault contract. Proxy admin and owner/keeper cannot be the same address.
  // TODO:Not using proxy yet, no need to change admin

  //2. Call setAnnualizedVol in manualVolOracle (otherwise you'll get !sSQRT on commitAndClose).
  //We use MockVolOracle in this case
  await mockVolatilityOracle.setAnnualizedVol(1);
  console.log("Call setAnnualizedVol in manualVolOracle");

  //3. Call whitelistCollateral in Whitelist contract
  // get whitelist contract deployment first
  const whitelist = await ethers.getContractAt(
    "IGammaWhitelist",
    GAMMA_WHITELIST[chainId]
  );
  //whitelist collateral
  const ownerSigner = await ethers.provider.getSigner(owner);
  await whitelist.connect(ownerSigner).whitelistCollateral(WETH_ADDRESS[chainId]);
  console.log("Call whitelistCollateral in Whitelist contract");

  //4. Call whitelistProduct in Whitelist contract
  await whitelist
  .connect(ownerSigner)
  .whitelistProduct(WETH_ADDRESS[chainId], USDC_ADDRESS[chainId], WETH_ADDRESS[chainId], false);
  console.log("Call whitelistProduct in Whitelist contract");

  //5.Call commitAndClose on vault proxy
  await vaultDeployment.connect(ownerSigner).commitAndClose();
  console.log("Call commitAndClose on vault proxy");

  //6. Call depositETH
  await vaultDeployment.connect(ownerSigner).depositETH({ value: ethers.utils.parseEther("332") });
  console.log("Call depositETH");

  //7. wait for 15 minutes and call rollToNextOption
  const keeperSigner = await ethers.provider.getSigner(keeper);
  await vaultDeployment.connect(keeperSigner).rollToNextOption();
  console.log("wait for 15 minutes and call rollToNextOption");

};
main.tags = ["RibbonThetaVaultLogic"];

export default main;
