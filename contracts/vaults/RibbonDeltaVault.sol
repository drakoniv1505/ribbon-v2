// SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import {SafeMath} from "@openzeppelin/contracts/math/SafeMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import {GnosisAuction} from "../libraries/GnosisAuction.sol";
import {OptionsDeltaVaultStorage} from "../storage/OptionsVaultStorage.sol";
import {Vault} from "../libraries/Vault.sol";
import {VaultLifecycle} from "../libraries/VaultLifecycle.sol";
import {ShareMath} from "../libraries/ShareMath.sol";
import {RibbonVault} from "./base/RibbonVault.sol";

contract RibbonDeltaVault is RibbonVault, OptionsDeltaVaultStorage {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using ShareMath for Vault.DepositReceipt;

    /************************************************
     *  IMMUTABLES & CONSTANTS
     ***********************************************/

    /************************************************
     *  EVENTS
     ***********************************************/

    event OpenLong(
        address indexed options,
        uint256 depositAmount,
        address manager
    );

    event CloseLong(
        address indexed options,
        uint256 withdrawAmount,
        address manager
    );

    event NewOptionAllocationSet(
        uint256 optionAllocationPct,
        uint256 newOptionAllocationPct
    );

    /************************************************
     *  CONSTRUCTOR & INITIALIZATION
     ***********************************************/

    /**
     * @notice Initializes the contract with immutable variables
     * @param _weth is the Wrapped Ether contract
     * @param _usdc is the USDC contract
     * It's important to bake the _factory variable into the contract with the constructor
     * If we do it in the `initialize` function, users get to set the factory variable and
     * subsequently the adapter, which allows them to make a delegatecall, then selfdestruct the contract.
     */
    constructor(
        address _weth,
        address _usdc,
        address _gammaController,
        address _marginPool,
        address _gnosisEasyAuction
    )
        RibbonVault(
            _weth,
            _usdc,
            _gammaController,
            _marginPool,
            _gnosisEasyAuction
        )
    {}

    /**
     * @notice Initializes the OptionVault contract with storage variables.
     */
    function initialize(
        address _owner,
        address _feeRecipient,
        uint256 _managementFee,
        uint256 _performanceFee,
        string memory tokenName,
        string memory tokenSymbol,
        address _counterpartyThetaVault,
        uint256 _optionAllocationPct,
        Vault.VaultParams calldata _vaultParams
    ) external initializer {
        baseInitialize(
            _owner,
            _feeRecipient,
            _managementFee,
            _performanceFee,
            tokenName,
            tokenSymbol,
            _vaultParams
        );
        require(
            _counterpartyThetaVault != address(0),
            "!_counterpartyThetaVault"
        );
        require(
            _optionAllocationPct > 0 && _optionAllocationPct < 10000,
            "!_optionAllocationPct"
        );
        counterpartyThetaVault = _counterpartyThetaVault;
        optionAllocationPct = _optionAllocationPct;
    }

    /************************************************
     *  SETTERS
     ***********************************************/

    /**
     * @notice Sets the new % allocation of funds towards options purchases ( 3 decimals. ex: 55 * 10 ** 2 is 55%)
     * @param newOptionAllocationPct is the option % allocation
     */
    function setOptionAllocation(uint16 newOptionAllocationPct)
        external
        onlyOwner
    {
        // Needs to be less than 10%
        require(
            newOptionAllocationPct > 0 && newOptionAllocationPct < 1000,
            "Invalid allocation"
        );

        emit NewOptionAllocationSet(
            optionAllocationPct,
            newOptionAllocationPct
        );

        optionAllocationPct = newOptionAllocationPct;
    }

    /************************************************
     *  VAULT OPERATIONS
     ***********************************************/

    /**
     * @notice Closes the existing long.
     *         This allows all the users to withdraw if the next option is malicious.
     */
    function commitAndClose() external onlyOwner nonReentrant {}

    /**
     * @notice Rolls the vault's funds into a new long position.
     */
    function rollToNextOption() external nonReentrant {}
}